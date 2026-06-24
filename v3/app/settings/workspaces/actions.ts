'use server';

import { revalidatePath } from 'next/cache';
import { ZodSafeParseResult } from 'zod';

import {
  createWorkspace,
  deleteWorkspaceById,
  getWorkspaceById,
  getWorkspaceBySlug,
  listWorkspaces,
  readWorkspaceConfigJson,
  updateWorkspace,
  writeWorkspaceConfigJson,
} from '@/db/queries/workspaces';
import { workspaceOverridesSchema } from '@/lib/config';
import { validateConfigUpdate } from '@/lib/config-validateUpdate';
import { workspaceLog } from '@/lib/logger';
import { requireAuth } from '@/lib/requireAuth';
import type { ServerActionResult } from '@/lib/serverAction';
import { workspaceNameSchema, workspaceSlugSchema } from '@/lib/workspaces';

const ErrorResults = {
  WORKSPACE_NOT_FOUND: { success: false, message: 'Workspace not found' },
  CANNOT_MODIFY_DEFAULT_SLUG: {
    success: false,
    message: 'The default workspace does not have a slug',
  },
  CANNOT_DELETE_DEFAULT: {
    success: false,
    message: 'The default workspace cannot be deleted',
  },
  INVALID_INPUT: { success: false, message: 'Invalid input' },
  invalidField: (message: string): ServerActionResult => ({ success: false, message }),
  slugTaken: (slug: string): ServerActionResult => ({
    success: false,
    message: `A workspace with slug "${slug}" already exists`,
  }),
} as const;

type ParseOutput<T> = { value: T } | { error: string };

const parseString = (
  input: unknown,
  fieldName: string,
  validator: (value: string) => ZodSafeParseResult<string>,
): ParseOutput<string> => {
  if (typeof input !== 'string') {
    return { error: `${fieldName} is required` };
  }

  const result = validator(input);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? `Invalid ${fieldName}` };
  }

  return { value: result.data };
};

const revalidateAllPages = () => {
  revalidatePath('/', 'layout');
};

const parseName = (input: unknown) => parseString(input, 'Name', workspaceNameSchema.safeParse);

const parseSlug = (input: unknown) => parseString(input, 'Slug', workspaceSlugSchema.safeParse);

const parseBoolean = (input: unknown, fieldName: string): ParseOutput<boolean> => {
  if (typeof input !== 'boolean') {
    return { error: `${fieldName} must be true or false` };
  }

  return { value: input };
};

export type CreateWorkspacePayload = {
  name: unknown;
  slug: unknown;
  isPublic: unknown;
};

export const createWorkspaceAction = requireAuth(
  async ({ name, slug, isPublic }: CreateWorkspacePayload): Promise<ServerActionResult> => {
    const nameResult = parseName(name);

    if ('error' in nameResult) {
      return ErrorResults.invalidField(nameResult.error);
    }

    const slugResult = parseSlug(slug);

    if ('error' in slugResult) {
      return ErrorResults.invalidField(slugResult.error);
    }

    if (getWorkspaceBySlug(slugResult.value) !== null) {
      return ErrorResults.slugTaken(slugResult.value);
    }

    const isPublicResult = parseBoolean(isPublic, 'Public');

    if ('error' in isPublicResult) {
      return ErrorResults.invalidField(isPublicResult.error);
    }

    const workspace = createWorkspace({
      slug: slugResult.value,
      name: nameResult.value,
      isPublic: isPublicResult.value,
    });

    workspaceLog.info({ id: workspace.id, slug: workspace.slug }, 'workspace created');

    revalidateAllPages();

    return { success: true, message: 'Workspace created' };
  },
);

export type UpdateWorkspacePayload = Partial<CreateWorkspacePayload> & { id: unknown };

export const updateWorkspaceAction = requireAuth(
  async (input: UpdateWorkspacePayload): Promise<ServerActionResult> => {
    if (typeof input.id !== 'number') {
      return ErrorResults.INVALID_INPUT;
    }

    const workspace = getWorkspaceById(input.id);

    if (workspace === null) {
      return ErrorResults.WORKSPACE_NOT_FOUND;
    }

    const updates: { name?: string; slug?: string; isPublic?: boolean } = {};

    if (input.name !== undefined) {
      const nameResult = parseName(input.name);

      if ('error' in nameResult) {
        return ErrorResults.invalidField(nameResult.error);
      }

      updates.name = nameResult.value;
    }

    if (input.slug !== undefined) {
      if (workspace.isDefault) {
        return ErrorResults.CANNOT_MODIFY_DEFAULT_SLUG;
      }

      const slugResult = parseSlug(input.slug);

      if ('error' in slugResult) {
        return ErrorResults.invalidField(slugResult.error);
      }

      if (slugResult.value !== workspace.slug && getWorkspaceBySlug(slugResult.value) !== null) {
        return ErrorResults.slugTaken(slugResult.value);
      }

      updates.slug = slugResult.value;
    }

    if (input.isPublic !== undefined) {
      const isPublicResult = parseBoolean(input.isPublic, 'Public');

      if ('error' in isPublicResult) {
        return ErrorResults.invalidField(isPublicResult.error);
      }

      updates.isPublic = isPublicResult.value;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true, message: 'No changes' };
    }

    updateWorkspace({ id: input.id, ...updates });

    workspaceLog.info({ id: input.id, keys: Object.keys(updates) }, 'workspace updated');

    revalidateAllPages();

    return { success: true, message: 'Workspace updated' };
  },
);

export const deleteWorkspaceAction = requireAuth(
  async (workspaceId: unknown): Promise<ServerActionResult> => {
    if (typeof workspaceId !== 'number') {
      return ErrorResults.INVALID_INPUT;
    }

    const workspace = getWorkspaceById(workspaceId);

    if (workspace === null) {
      return ErrorResults.WORKSPACE_NOT_FOUND;
    }

    if (workspace.isDefault) {
      workspaceLog.warn({ id: workspaceId }, 'refused to delete default workspace');

      return ErrorResults.CANNOT_DELETE_DEFAULT;
    }

    deleteWorkspaceById(workspaceId);

    workspaceLog.info({ id: workspaceId, slug: workspace.slug }, 'workspace deleted');

    revalidateAllPages();

    return { success: true, message: 'Workspace deleted' };
  },
);

export const updateWorkspaceConfigAction = requireAuth(
  async (input: { id: unknown; updatedConfigKeys: unknown }): Promise<ServerActionResult> => {
    if (typeof input.id !== 'number') {
      return ErrorResults.INVALID_INPUT;
    }

    const workspace = getWorkspaceById(input.id);

    if (workspace === null) {
      return ErrorResults.WORKSPACE_NOT_FOUND;
    }

    const currentConfig = readWorkspaceConfigJson(input.id) ?? {};
    const validationResult = validateConfigUpdate({
      updatedConfigKeys: input.updatedConfigKeys,
      currentConfig,
      schema: workspaceOverridesSchema,
    });

    if (!validationResult.success) {
      return { success: false, message: validationResult.message };
    }

    writeWorkspaceConfigJson(input.id, validationResult.newConfig);

    workspaceLog.info(
      { id: input.id, keys: Object.keys(validationResult.validatedConfig) },
      'workspace config updated',
    );

    revalidateAllPages();

    return { success: true, message: validationResult.message };
  },
);

export const listWorkspacesAction = async () => {
  return listWorkspaces();
};
