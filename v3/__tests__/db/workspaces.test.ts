import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createWorkspace,
  deleteWorkspaceById,
  getDefaultWorkspace,
  getWorkspaceById,
  getWorkspaceBySlug,
  listWorkspaces,
  readWorkspaceConfigJson,
  seedDefaultWorkspace,
  updateWorkspace,
  writeWorkspaceConfigJson,
} from '@/db/queries/workspaces';
import { createTestDb, type TestDb } from '../helpers/createTestDb';

let testDb: TestDb;

beforeEach(() => {
  testDb = createTestDb();
});

afterEach(() => {
  testDb.close();
});

describe('seedDefaultWorkspace', () => {
  it('creates the default workspace on first run', () => {
    const createdWorkspace = seedDefaultWorkspace(testDb.db);

    expect(createdWorkspace).toBe(true);

    const workspace = getDefaultWorkspace(testDb.db);

    expect(workspace).not.toBeNull();
    expect(workspace?.slug).toBeNull();
    expect(workspace?.isDefault).toBe(true);
    expect(workspace?.isPublic).toBe(true);
  });

  it('does not create a second default workspace on a re-run', () => {
    seedDefaultWorkspace(testDb.db);
    const createdWorkspace = seedDefaultWorkspace(testDb.db);

    expect(createdWorkspace).toBe(false);
    expect(listWorkspaces(testDb.db)).toHaveLength(1);
  });
});

describe('createWorkspace', () => {
  beforeEach(() => {
    seedDefaultWorkspace(testDb.db);
  });

  it('inserts a workspace and returns it', () => {
    const createdWorkspace = createWorkspace(
      { slug: 'home', name: 'Home', isPublic: true },
      testDb.db,
    );

    expect(createdWorkspace.slug).toBe('home');
    expect(createdWorkspace.isDefault).toBe(false);
    expect(getWorkspaceBySlug('home', testDb.db)).not.toBeNull();
  });

  it('rejects two workspaces with the same slug', () => {
    createWorkspace({ slug: 'home', name: 'Home', isPublic: true }, testDb.db);

    expect(() =>
      createWorkspace({ slug: 'home', name: 'Other home', isPublic: true }, testDb.db),
    ).toThrow();
  });
});

describe('updateWorkspace', () => {
  it('only changes the fields provided in the patch', () => {
    seedDefaultWorkspace(testDb.db);
    const createdWorkspace = createWorkspace(
      { slug: 'home', name: 'Home', isPublic: true },
      testDb.db,
    );

    updateWorkspace({ id: createdWorkspace.id, name: 'Renamed' }, testDb.db);

    const updated = getWorkspaceById(createdWorkspace.id, testDb.db);

    expect(updated?.name).toBe('Renamed');
    expect(updated?.slug).toBe('home');
    expect(updated?.isPublic).toBe(true);
  });
});

describe('deleteWorkspaceById', () => {
  beforeEach(() => {
    seedDefaultWorkspace(testDb.db);
  });

  it('removes a non-default workspace', () => {
    const createdWorkspace = createWorkspace(
      { slug: 'home', name: 'Home', isPublic: true },
      testDb.db,
    );

    deleteWorkspaceById(createdWorkspace.id, testDb.db);

    expect(getWorkspaceById(createdWorkspace.id, testDb.db)).toBeNull();
  });

  it('refuses to delete the default workspace', () => {
    const defaultWorkspace = getDefaultWorkspace(testDb.db);

    if (!defaultWorkspace) {
      throw new Error('default workspace was not seeded by beforeEach');
    }

    deleteWorkspaceById(defaultWorkspace.id, testDb.db);

    expect(getDefaultWorkspace(testDb.db)).not.toBeNull();
  });
});

describe('read/ write WorkspaceConfigJson', () => {
  it('returns an empty object when nothing has been written yet', () => {
    seedDefaultWorkspace(testDb.db);

    const createdWorkspace = createWorkspace(
      { slug: 'home', name: 'Home', isPublic: true },
      testDb.db,
    );

    expect(readWorkspaceConfigJson(createdWorkspace.id, testDb.db)).toEqual({});
  });

  it('returns the same config that was written', () => {
    seedDefaultWorkspace(testDb.db);

    const createdWorkspace = createWorkspace(
      { slug: 'home', name: 'Home', isPublic: true },
      testDb.db,
    );

    writeWorkspaceConfigJson(createdWorkspace.id, { theme: 'paper', hideHeader: true }, testDb.db);

    expect(readWorkspaceConfigJson(createdWorkspace.id, testDb.db)).toEqual({
      theme: 'paper',
      hideHeader: true,
    });
  });

  it('returns null when the workspace does not exist', () => {
    expect(readWorkspaceConfigJson(9999, testDb.db)).toBeNull();
  });

  it('treats malformed JSON as an empty config object', () => {
    seedDefaultWorkspace(testDb.db);
    const createdWorkspace = createWorkspace(
      { slug: 'home', name: 'Home', isPublic: true },
      testDb.db,
    );

    testDb.sqlite
      .prepare('UPDATE workspaces SET config_json = ? WHERE id = ?')
      .run('not-json', createdWorkspace.id);

    expect(readWorkspaceConfigJson(createdWorkspace.id, testDb.db)).toEqual({});
  });
});

describe('listWorkspaces', () => {
  it('returns workspaces sorted alphabetically by name', () => {
    seedDefaultWorkspace(testDb.db);
    createWorkspace({ slug: 'zeta', name: 'Zeta', isPublic: true }, testDb.db);
    createWorkspace({ slug: 'alpha', name: 'Alpha', isPublic: true }, testDb.db);
    createWorkspace({ slug: 'beta', name: 'Beta', isPublic: true }, testDb.db);

    const workspaces = listWorkspaces(testDb.db);
    const nonDefaultNames = workspaces
      .filter(({ isDefault }) => !isDefault)
      .map(({ name }) => name);

    expect(nonDefaultNames).toEqual(['Alpha', 'Beta', 'Zeta']);
  });
});
