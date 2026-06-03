import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  deleteThemeByName,
  getThemeByName,
  createTheme,
  listThemes,
  seedBuiltInThemes,
  updateThemeByName,
} from '@/db/queries/themes';
import { themes } from '@/db/schema/themes';
import { BUILT_IN_THEMES } from '@/lib/themes';
import { createTestDb, type TestDb } from '../helpers/createTestDb';

let testDb: TestDb;

beforeEach(() => {
  testDb = createTestDb();
});

afterEach(() => {
  testDb.close();
});

describe('themes queries', () => {
  it('returns an empty array when no themes exist', () => {
    expect(listThemes(testDb.db)).toEqual([]);
  });

  it('inserts a custom theme and reads it back', () => {
    createTheme(
      {
        name: 'my_theme',
        colors: { background: '#000000', primary: '#ffffff', accent: '#abcdef' },
        isCustom: true,
      },
      testDb.db,
    );

    const stored = getThemeByName('my_theme', testDb.db);

    expect(stored).toEqual({
      name: 'my_theme',
      colors: { background: '#000000', primary: '#ffffff', accent: '#abcdef' },
      isCustom: true,
    });
  });

  it('returns null for an unknown theme name', () => {
    expect(getThemeByName('does-not-exist', testDb.db)).toBeNull();
  });

  it('rejects duplicate theme names', () => {
    createTheme(
      {
        name: 'duplicate',
        colors: { background: '#000', primary: '#fff', accent: '#aaa' },
        isCustom: true,
      },
      testDb.db,
    );

    expect(() =>
      createTheme(
        {
          name: 'duplicate',
          colors: { background: '#111', primary: '#eee', accent: '#bbb' },
          isCustom: true,
        },
        testDb.db,
      ),
    ).toThrow();
  });

  it('updates an existing theme by name', () => {
    createTheme(
      {
        name: 'original',
        colors: { background: '#000', primary: '#fff', accent: '#aaa' },
        isCustom: true,
      },
      testDb.db,
    );

    updateThemeByName(
      {
        originalName: 'original',
        name: 'renamed',
        colors: { background: '#111111', primary: '#eeeeee', accent: '#bbbbbb' },
      },
      testDb.db,
    );

    expect(getThemeByName('original', testDb.db)).toBeNull();
    expect(getThemeByName('renamed', testDb.db)).toEqual({
      name: 'renamed',
      colors: { background: '#111111', primary: '#eeeeee', accent: '#bbbbbb' },
      isCustom: true,
    });
  });

  it('deletes a theme by name', () => {
    createTheme(
      {
        name: 'to-delete',
        colors: { background: '#000', primary: '#fff', accent: '#aaa' },
        isCustom: true,
      },
      testDb.db,
    );

    deleteThemeByName('to-delete', testDb.db);

    expect(getThemeByName('to-delete', testDb.db)).toBeNull();
  });

  it('skips theme rows with invalid colors_json when listing', () => {
    const now = Date.now();

    testDb.db
      .insert(themes)
      .values({
        name: 'broken',
        colorsJson: 'not-json',
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    createTheme(
      {
        name: 'good',
        colors: { background: '#000', primary: '#fff', accent: '#aaa' },
        isCustom: true,
      },
      testDb.db,
    );

    const listed = listThemes(testDb.db);

    expect(listed.map(theme => theme.name)).toEqual(['good']);
  });
});

describe('seedBuiltInThemes', () => {
  it('seeds every built-in theme on first run', () => {
    const inserted = seedBuiltInThemes(testDb.db);

    expect(inserted).toBe(BUILT_IN_THEMES.length);
    expect(listThemes(testDb.db)).toHaveLength(BUILT_IN_THEMES.length);
  });

  it('does not duplicate built-in themes on a second run', () => {
    seedBuiltInThemes(testDb.db);
    const insertedOnSecondRun = seedBuiltInThemes(testDb.db);

    expect(insertedOnSecondRun).toBe(0);
    expect(listThemes(testDb.db)).toHaveLength(BUILT_IN_THEMES.length);
  });

  it('inserts only the missing built-in themes when some already exist', () => {
    const { name, colors } = BUILT_IN_THEMES[0];

    createTheme({ name, colors, isCustom: false }, testDb.db);

    const inserted = seedBuiltInThemes(testDb.db);

    expect(inserted).toBe(BUILT_IN_THEMES.length - 1);
  });
});
