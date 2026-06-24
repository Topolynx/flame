import { and, asc, eq, isNull, ne } from 'drizzle-orm';

import { db, type DbClient } from '@/db';
import { workspaces, type WorkspaceRow } from '@/db/schema/workspaces';
import { parseUnvalidatedConfigJson, type UnvalidatedConfig } from '@/lib/config';
import { workspaceLog } from '@/lib/logger';
import type { Workspace } from '@/lib/workspaces';

const DEFAULT_WORKSPACE_NAME = 'Default';

const rowToWorkspace = ({
  configJson: _cj,
  createdAt: _ct,
  updatedAt: _ut,
  ...workspace
}: WorkspaceRow): Workspace => workspace;

export const listWorkspaces = (client: DbClient = db): Workspace[] => {
  const rows = client.select().from(workspaces).orderBy(asc(workspaces.name)).all();

  return rows.map(rowToWorkspace);
};

export const getWorkspaceById = (id: number, client: DbClient = db): Workspace | null => {
  const row = client.select().from(workspaces).where(eq(workspaces.id, id)).get();

  return row === undefined ? null : rowToWorkspace(row);
};

export const getWorkspaceBySlug = (slug: string, client: DbClient = db): Workspace | null => {
  const row = client.select().from(workspaces).where(eq(workspaces.slug, slug)).get();

  return row === undefined ? null : rowToWorkspace(row);
};

export const getDefaultWorkspace = (client: DbClient = db): Workspace | null => {
  const row = client
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.isDefault, true), isNull(workspaces.slug)))
    .get();

  return row === undefined ? null : rowToWorkspace(row);
};

export const readWorkspaceConfigJson = (
  id: number,
  client: DbClient = db,
): UnvalidatedConfig | null => {
  const row = client
    .select({ configJson: workspaces.configJson })
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .get();

  if (row === undefined) {
    return null;
  }

  return parseUnvalidatedConfigJson(row.configJson, {
    log: workspaceLog,
    message: 'workspace config_json was not valid JSON; treating as empty',
    context: { workspaceId: id },
  });
};

export type CreateWorkspacePayload = Pick<Workspace, 'slug' | 'name' | 'isPublic'>;

export const createWorkspace = (
  { slug, name, isPublic }: CreateWorkspacePayload,
  client: DbClient = db,
): Workspace => {
  const now = Date.now();

  const inserted = client
    .insert(workspaces)
    .values({
      slug,
      name,
      isDefault: false,
      isPublic,
      configJson: '{}',
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return rowToWorkspace(inserted);
};

export type UpdateWorkspacePayload = Partial<Pick<Workspace, 'slug' | 'name' | 'isPublic'>> & {
  id: number;
};

export const updateWorkspace = (
  { id, slug, name, isPublic }: UpdateWorkspacePayload,
  client: DbClient = db,
): void => {
  const patch: Partial<Pick<WorkspaceRow, 'slug' | 'name' | 'isPublic'>> & { updatedAt: number } = {
    updatedAt: Date.now(),
  };

  if (slug !== undefined) {
    patch.slug = slug;
  }

  if (name !== undefined) {
    patch.name = name;
  }

  if (isPublic !== undefined) {
    patch.isPublic = isPublic;
  }

  client.update(workspaces).set(patch).where(eq(workspaces.id, id)).run();
};

export const writeWorkspaceConfigJson = (
  id: number,
  newConfig: UnvalidatedConfig,
  client: DbClient = db,
): void => {
  client
    .update(workspaces)
    .set({ configJson: JSON.stringify(newConfig), updatedAt: Date.now() })
    .where(eq(workspaces.id, id))
    .run();
};

export const deleteWorkspaceById = (id: number, client: DbClient = db): void => {
  client
    .delete(workspaces)
    .where(and(eq(workspaces.id, id), ne(workspaces.isDefault, true)))
    .run();
};

export const seedDefaultWorkspace = (client: DbClient = db): boolean => {
  const defaultWorkspace = getDefaultWorkspace(client);

  if (defaultWorkspace !== null) {
    return false;
  }

  const now = Date.now();

  client
    .insert(workspaces)
    .values({
      slug: null,
      name: DEFAULT_WORKSPACE_NAME,
      isDefault: true,
      isPublic: true,
      configJson: '{}',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  workspaceLog.info({ name: DEFAULT_WORKSPACE_NAME }, 'seeded default workspace');

  return true;
};
