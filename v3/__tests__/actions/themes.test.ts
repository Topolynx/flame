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

const themeCookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = themeCookieStore.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      themeCookieStore.set(name, value);
    },
    delete: (name: string) => {
      themeCookieStore.delete(name);
    },
  })),
}));

import { sqlite } from '@/db';
import {
  createCustomTheme,
  deleteCustomTheme,
  exportThemesJson,
  importThemesFromJson,
  setDefaultTheme,
  setPreferredLocalTheme,
  updateCustomTheme,
} from '@/app/settings/themes/actions';
import { readGlobalConfigJson } from '@/db/queries/globalConfig';
import { getThemeByName, createTheme, listThemes, seedBuiltInThemes } from '@/db/queries/themes';
import { isAuthenticated } from '@/lib/auth';
import { THEME_COOKIE } from '@/lib/themeCookie';

const VALID_COLORS = { background: '#101010', primary: '#fefefe', accent: '#abcdef' };

beforeEach(() => {
  sqlite.prepare('DELETE FROM themes').run();
  sqlite.prepare('DELETE FROM global_config').run();
  themeCookieStore.clear();
  vi.mocked(isAuthenticated).mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createCustomTheme', () => {
  it('inserts a new custom theme', async () => {
    const result = await createCustomTheme({ name: 'custom', colors: VALID_COLORS });

    expect(result.success).toBe(true);
    expect(getThemeByName('custom')).toEqual({
      name: 'custom',
      colors: VALID_COLORS,
      isCustom: true,
    });
  });

  it('rejects unauthenticated callers', async () => {
    vi.mocked(isAuthenticated).mockResolvedValueOnce(false);

    const result = await createCustomTheme({ name: 'custom', colors: VALID_COLORS });

    expect(result.success).toBe(false);
    expect(getThemeByName('custom')).toBeNull();
  });

  it('rejects names that collide with a built-in theme', async () => {
    const result = await createCustomTheme({ name: 'tron', colors: VALID_COLORS });

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain('already exists');
  });

  it('rejects names that collide with an existing custom theme', async () => {
    createTheme({ name: 'taken', colors: VALID_COLORS, isCustom: true });

    const result = await createCustomTheme({ name: 'taken', colors: VALID_COLORS });

    expect(result.success).toBe(false);
  });

  it('rejects invalid colors', async () => {
    const result = await createCustomTheme({
      name: 'invalid',
      colors: { background: 'red', primary: '#fff', accent: '#000' },
    });

    expect(result.success).toBe(false);
    expect(getThemeByName('invalid')).toBeNull();
  });

  it('rejects names with disallowed characters', async () => {
    const result = await createCustomTheme({
      name: 'Invalid Name!',
      colors: VALID_COLORS,
    });

    expect(result.success).toBe(false);
  });
});

describe('updateCustomTheme', () => {
  beforeEach(() => {
    createTheme({ name: 'custom', colors: VALID_COLORS, isCustom: true });
  });

  it('renames and recolors an existing custom theme', async () => {
    const result = await updateCustomTheme({
      originalName: 'custom',
      name: 'renamed',
      colors: { background: '#222222', primary: '#eeeeee', accent: '#cccccc' },
    });

    expect(result.success).toBe(true);
    expect(getThemeByName('custom')).toBeNull();
    expect(getThemeByName('renamed')).toEqual({
      name: 'renamed',
      colors: { background: '#222222', primary: '#eeeeee', accent: '#cccccc' },
      isCustom: true,
    });
  });

  it('refuses to rename a built-in theme', async () => {
    createTheme({ name: 'tron', colors: VALID_COLORS, isCustom: false });

    const result = await updateCustomTheme({
      originalName: 'tron',
      name: 'tron2',
      colors: VALID_COLORS,
    });

    expect(result.success).toBe(false);
    expect(getThemeByName('tron')).not.toBeNull();
  });

  it('refuses to overwrite an existing theme name', async () => {
    createTheme({ name: 'other', colors: VALID_COLORS, isCustom: true });

    const result = await updateCustomTheme({
      originalName: 'original',
      name: 'other',
      colors: VALID_COLORS,
    });

    expect(result.success).toBe(false);
  });
});

describe('deleteCustomTheme', () => {
  beforeEach(() => {
    createTheme({ name: 'todelete', colors: VALID_COLORS, isCustom: true });
  });

  it('removes the theme from the database', async () => {
    const result = await deleteCustomTheme('todelete');

    expect(result.success).toBe(true);
    expect(getThemeByName('todelete')).toBeNull();
  });

  it('refuses to delete a built-in theme', async () => {
    createTheme({ name: 'tron', colors: VALID_COLORS, isCustom: false });

    const result = await deleteCustomTheme('tron');

    expect(result.success).toBe(false);
    expect(getThemeByName('tron')).not.toBeNull();
  });

  it('rejects unauthenticated callers', async () => {
    vi.mocked(isAuthenticated).mockResolvedValueOnce(false);

    const result = await deleteCustomTheme('todelete');

    expect(result.success).toBe(false);
    expect(getThemeByName('todelete')).not.toBeNull();
  });
});

describe('setPreferredLocalTheme', () => {
  it('writes the cookie for a built-in theme without requiring a DB row', async () => {
    const result = await setPreferredLocalTheme('tron');

    expect(result.success).toBe(true);
    expect(themeCookieStore.get(THEME_COOKIE)).toBe('tron');
  });

  it('writes the cookie for a custom theme that exists in the DB', async () => {
    createTheme({ name: 'custom', colors: VALID_COLORS, isCustom: true });

    const result = await setPreferredLocalTheme('custom');

    expect(result.success).toBe(true);
    expect(themeCookieStore.get(THEME_COOKIE)).toBe('custom');
  });

  it('refuses to write the cookie for a theme that does not exist', async () => {
    const result = await setPreferredLocalTheme('ghost-theme');

    expect(result.success).toBe(false);
    expect(themeCookieStore.has(THEME_COOKIE)).toBe(false);
  });

  it('works without requiring authentication', async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(false);

    const result = await setPreferredLocalTheme('paper');

    expect(result.success).toBe(true);
    expect(themeCookieStore.get(THEME_COOKIE)).toBe('paper');
  });

  it('does not touch global config', async () => {
    await setPreferredLocalTheme('paper');

    expect(readGlobalConfigJson().theme).toBeUndefined();
    expect(readGlobalConfigJson().defaultTheme).toBeUndefined();
  });
});

describe('setDefaultTheme', () => {
  it('persists the default theme', async () => {
    const result = await setDefaultTheme('paper');

    expect(result.success).toBe(true);
    expect(readGlobalConfigJson().defaultTheme).toBe('paper');
  });
});

describe('importThemesFromJson and exportThemesJson', () => {
  it('imports a wrapped { themes: [...] } payload', async () => {
    seedBuiltInThemes();

    const payload = JSON.stringify({
      themes: [
        { name: 'imported_one', colors: VALID_COLORS },
        {
          name: 'imported_two',
          colors: { background: '#222', primary: '#eee', accent: '#bbb' },
        },
      ],
    });

    const result = await importThemesFromJson(payload);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(getThemeByName('imported_one')).not.toBeNull();
    expect(getThemeByName('imported_two')).not.toBeNull();
  });

  it('skips entries that already exist as built-ins or duplicates', async () => {
    createTheme({ name: 'taken', colors: VALID_COLORS, isCustom: true });

    const payload = JSON.stringify([
      { name: 'tron', colors: VALID_COLORS },
      { name: 'taken', colors: VALID_COLORS },
      { name: 'fresh', colors: VALID_COLORS },
    ]);

    const result = await importThemesFromJson(payload);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.skipped).toEqual(expect.arrayContaining(['tron', 'taken']));
  });

  it('rejects malformed JSON', async () => {
    const result = await importThemesFromJson('{not-json');

    expect(result.success).toBe(false);
  });

  it('rejects JSON that does not match the theme shape', async () => {
    const result = await importThemesFromJson(JSON.stringify({ foo: 'bar' }));

    expect(result.success).toBe(false);
  });

  it('exports and imports custom themes', async () => {
    createTheme({
      name: 'custom1',
      colors: { background: '#000', primary: '#fff', accent: '#aaa' },
      isCustom: true,
    });

    createTheme({
      name: 'custom2',
      colors: { background: '#111', primary: '#eee', accent: '#bbb' },
      isCustom: true,
    });

    const exported = await exportThemesJson('custom');
    const parsed = JSON.parse(exported) as { themes: { name: string }[] };

    expect(parsed.themes.map(({ name }) => name).sort()).toEqual(['custom1', 'custom2']);

    sqlite.prepare('DELETE FROM themes').run();

    const result = await importThemesFromJson(exported);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(
      listThemes()
        .map(({ name }) => name)
        .sort(),
    ).toEqual(['custom1', 'custom2']);
  });
});
