import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db', async () => {
  const path = await import('node:path');
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const schema = await import('@/db/schema');

  const sqlite = new Database(':memory:');

  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  migrate(db, { migrationsFolder: path.join(process.cwd(), 'db', 'migrations') });

  return { db, sqlite };
});

vi.mock('@/lib/auth', () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
  getCurrentUser: vi.fn(),
  isAuthDisabled: vi.fn().mockReturnValue(false),
  SESSION_COOKIE: 'flame_session',
  ADMIN_USER: { id: 1, role: 'admin' as const },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { sqlite } from '@/db';
import {
  createWorkspaceAction,
  deleteWorkspaceAction,
  updateWorkspaceAction,
  updateWorkspaceConfigAction,
} from '@/app/settings/workspaces/actions';
import {
  createWorkspace,
  getWorkspaceById,
  getWorkspaceBySlug,
  listWorkspaces,
  readWorkspaceConfigJson,
  seedDefaultWorkspace,
} from '@/db/queries/workspaces';
import { isAuthenticated } from '@/lib/auth';

beforeEach(() => {
  sqlite.prepare('DELETE FROM workspaces').run();
  seedDefaultWorkspace();
  vi.mocked(isAuthenticated).mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createWorkspaceAction', () => {
  it('creates a workspace when input is valid', async () => {
    const result = await createWorkspaceAction({
      name: 'Home',
      slug: 'home',
      isPublic: true,
    });

    expect(result.success).toBe(true);
    expect(getWorkspaceBySlug('home')).not.toBeNull();
  });

  it('rejects unauthenticated callers', async () => {
    vi.mocked(isAuthenticated).mockResolvedValueOnce(false);

    const result = await createWorkspaceAction({
      name: 'Home',
      slug: 'home',
      isPublic: true,
    });

    expect(result.success).toBe(false);
    expect(getWorkspaceBySlug('home')).toBeNull();
  });

  it('rejects a reserved slug', async () => {
    const result = await createWorkspaceAction({
      name: 'Reserved',
      slug: 'settings',
      isPublic: true,
    });

    expect(result.success).toBe(false);
    expect(getWorkspaceBySlug('settings')).toBeNull();
  });

  it('rejects a slug that is already taken', async () => {
    createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    const result = await createWorkspaceAction({
      name: 'Home duplicate',
      slug: 'home',
      isPublic: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already exists/i);
  });

  it('rejects an empty name', async () => {
    const result = await createWorkspaceAction({
      name: '',
      slug: 'home',
      isPublic: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a slug with uppercase letters', async () => {
    const result = await createWorkspaceAction({
      name: 'Home',
      slug: 'Home',
      isPublic: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('updateWorkspaceAction', () => {
  it('renames a workspace', async () => {
    const createdWorkspace = createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    const result = await updateWorkspaceAction({ id: createdWorkspace.id, name: 'Renamed' });

    expect(result.success).toBe(true);
    expect(getWorkspaceById(createdWorkspace.id)?.name).toBe('Renamed');
  });

  it('refuses to change the slug of the default workspace', async () => {
    const defaultWorkspace = listWorkspaces().find(({ isDefault }) => isDefault);

    if (!defaultWorkspace) {
      throw new Error('default workspace was not seeded by beforeEach');
    }

    const result = await updateWorkspaceAction({
      id: defaultWorkspace.id,
      slug: 'new-default-slug',
    });

    expect(result.success).toBe(false);
    expect(getWorkspaceById(defaultWorkspace.id)?.slug).toBeNull();
  });

  it('refuses to take a slug that is already used by another workspace', async () => {
    const first = createWorkspace({ slug: 'a', name: 'A', isPublic: true });

    createWorkspace({ slug: 'b', name: 'B', isPublic: true });

    const result = await updateWorkspaceAction({ id: first.id, slug: 'b' });

    expect(result.success).toBe(false);
    expect(getWorkspaceById(first.id)?.slug).toBe('a');
  });

  it('toggles visibility', async () => {
    const createdWorkspace = createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    const result = await updateWorkspaceAction({ id: createdWorkspace.id, isPublic: false });

    expect(result.success).toBe(true);
    expect(getWorkspaceById(createdWorkspace.id)?.isPublic).toBe(false);
  });
});

describe('deleteWorkspaceAction', () => {
  it('removes a non-default workspace', async () => {
    const createdWorkspace = createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    const result = await deleteWorkspaceAction(createdWorkspace.id);

    expect(result.success).toBe(true);
    expect(getWorkspaceById(createdWorkspace.id)).toBeNull();
  });

  it('refuses to delete the default workspace', async () => {
    const defaultWorkspace = listWorkspaces().find(({ isDefault }) => isDefault);

    if (!defaultWorkspace) {
      throw new Error('default workspace was not seeded by beforeEach');
    }

    const result = await deleteWorkspaceAction(defaultWorkspace.id);

    expect(result.success).toBe(false);
    expect(getWorkspaceById(defaultWorkspace.id)).not.toBeNull();
  });

  it('rejects unauthenticated callers', async () => {
    const createdWorkspace = createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    vi.mocked(isAuthenticated).mockResolvedValueOnce(false);

    const result = await deleteWorkspaceAction(createdWorkspace.id);

    expect(result.success).toBe(false);
    expect(getWorkspaceById(createdWorkspace.id)).not.toBeNull();
  });
});

describe('updateWorkspaceConfigAction', () => {
  it('writes only valid workspace-overridable keys', async () => {
    const createdWorkspace = createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    const result = await updateWorkspaceConfigAction({
      id: createdWorkspace.id,
      updatedConfigKeys: { theme: 'paper', hideHeader: true },
    });

    expect(result.success).toBe(true);
    expect(readWorkspaceConfigJson(createdWorkspace.id)).toEqual({
      theme: 'paper',
      hideHeader: true,
    });
  });

  it('drops global-only keys from the workspace config', async () => {
    const createdWorkspace = createWorkspace({ slug: 'home', name: 'Home', isPublic: true });

    const result = await updateWorkspaceConfigAction({
      id: createdWorkspace.id,
      updatedConfigKeys: { theme: 'paper', dockerHost: 'tcp://1.2.3.4:2375' },
    });

    expect(result.success).toBe(true);
    expect(readWorkspaceConfigJson(createdWorkspace.id)).toEqual({ theme: 'paper' });
  });

  it('returns workspace-not-found for a non-existent id', async () => {
    const result = await updateWorkspaceConfigAction({
      id: 999_999,
      updatedConfigKeys: { theme: 'paper' },
    });

    expect(result.success).toBe(false);
  });
});
