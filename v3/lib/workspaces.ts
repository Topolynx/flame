import { z } from 'zod';

import { RESERVED_WORKSPACE_SLUGS } from './constants';

export const WORKSPACE_SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const WORKSPACE_NAME_MAX_LENGTH = 60;
export const WORKSPACE_SLUG_MAX_LENGTH = 60;

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(WORKSPACE_NAME_MAX_LENGTH, `Name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters`);

export const workspaceSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(WORKSPACE_SLUG_MAX_LENGTH, `Slug must be at most ${WORKSPACE_SLUG_MAX_LENGTH} characters`)
  .regex(WORKSPACE_SLUG_REGEX, 'Slug must be lowercase letters, digits and dashes only')
  .refine(slug => !RESERVED_WORKSPACE_SLUGS.has(slug), {
    message: 'This slug is reserved',
  });

export const isReservedWorkspaceSlug = (slug: string): boolean =>
  RESERVED_WORKSPACE_SLUGS.has(slug);

export const isValidWorkspaceSlug = (slug: string): boolean =>
  workspaceSlugSchema.safeParse(slug).success;

export const slugifyWorkspaceName = (name: string): string =>
  name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, WORKSPACE_SLUG_MAX_LENGTH);

export const extractWorkspaceSlugFromPath = (pathname: string): string | null => {
  const trimmed = pathname.split('?')[0]?.split('#')[0] ?? '';
  const segments = trimmed.split('/').filter(segment => segment.length > 0);
  const slug = segments[0];

  if (!slug) {
    return null;
  }

  if (isReservedWorkspaceSlug(slug) || !isValidWorkspaceSlug(slug)) {
    return null;
  }

  return slug;
};

export type Workspace = {
  id: number;
  slug: string | null;
  name: string;
  isDefault: boolean;
  isPublic: boolean;
};

export const getWorkspaceHref = (workspace: Pick<Workspace, 'slug' | 'isDefault'>): string => {
  if (workspace.isDefault || workspace.slug === null) {
    return '/';
  }

  return `/${workspace.slug}`;
};

export const filterVisibleWorkspaces = (
  workspaces: Workspace[],
  isAuthenticated: boolean,
): Workspace[] => {
  if (isAuthenticated) {
    return workspaces;
  }

  return workspaces.filter(({ isPublic }) => isPublic);
};

export const sortWorkspacesForSwitcher = (workspaces: Workspace[]): Workspace[] => {
  const defaults = workspaces.filter(({ isDefault }) => isDefault);
  const others = workspaces
    .filter(({ isDefault }) => !isDefault)
    .sort((firstWorkspace, secondWorkspace) =>
      firstWorkspace.name.localeCompare(secondWorkspace.name),
    );

  return [...defaults, ...others];
};
