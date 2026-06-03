import { describe, expect, it } from 'vitest';

import {
  BUILT_IN_THEMES,
  buildRootThemeCss,
  isBuiltInThemeName,
  resolveActiveTheme,
  themeColorsSchema,
  themeImportPayloadSchema,
  themeNameSchema,
  type Theme,
} from '@/lib/themes';

describe('themeColorsSchema', () => {
  it('accepts a valid 6-digit hex color', () => {
    const result = themeColorsSchema.safeParse({
      background: '#242b33',
      primary: '#EFFBFF',
      accent: '#6EE2FF',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid 3-digit hex color', () => {
    const result = themeColorsSchema.safeParse({
      background: '#fff',
      primary: '#000',
      accent: '#abc',
    });

    expect(result.success).toBe(true);
  });

  it('rejects colors without a leading hash', () => {
    const result = themeColorsSchema.safeParse({
      background: '242b33',
      primary: '#fff',
      accent: '#000',
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-hex characters', () => {
    const result = themeColorsSchema.safeParse({
      background: '#zzzzzz',
      primary: '#fff',
      accent: '#000',
    });

    expect(result.success).toBe(false);
  });

  it('rejects four-digit hex values', () => {
    const result = themeColorsSchema.safeParse({
      background: '#abcd',
      primary: '#fff',
      accent: '#000',
    });

    expect(result.success).toBe(false);
  });

  it('rejects when a color is missing', () => {
    const result = themeColorsSchema.safeParse({ background: '#000', primary: '#fff' });

    expect(result.success).toBe(false);
  });
});

describe('themeNameSchema', () => {
  it('accepts lowercase alphanumeric names', () => {
    expect(themeNameSchema.safeParse('tron').success).toBe(true);
    expect(themeNameSchema.safeParse('paper2').success).toBe(true);
  });

  it('accepts hyphens and underscores in the middle', () => {
    expect(themeNameSchema.safeParse('my-cool-theme').success).toBe(true);
    expect(themeNameSchema.safeParse('my_cool_theme').success).toBe(true);
  });

  it('rejects names with leading hyphens', () => {
    expect(themeNameSchema.safeParse('-tron').success).toBe(false);
  });

  it('rejects names with uppercase letters', () => {
    expect(themeNameSchema.safeParse('Tron').success).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(themeNameSchema.safeParse('').success).toBe(false);
  });
});

describe('isBuiltInThemeName', () => {
  it('returns true for every built-in theme', () => {
    for (const { name } of BUILT_IN_THEMES) {
      expect(isBuiltInThemeName(name)).toBe(true);
    }
  });

  it('returns false for an unknown theme', () => {
    expect(isBuiltInThemeName('definitely-not-a-theme')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isBuiltInThemeName('')).toBe(false);
  });
});

describe('buildRootThemeCss', () => {
  it('returns a :root block with three CSS variables', () => {
    const block = buildRootThemeCss({
      background: '#242b33',
      primary: '#effbff',
      accent: '#6ee2ff',
    });

    expect(block).toContain(':root {');
    expect(block).toContain('--color-background: #242b33;');
    expect(block).toContain('--color-primary: #effbff;');
    expect(block).toContain('--color-accent: #6ee2ff;');
  });
});

describe('resolveActiveTheme', () => {
  const customTheme: Theme = {
    name: 'custom',
    colors: { background: '#101010', primary: '#fefefe', accent: '#abcdef' },
    isCustom: true,
  };

  it('returns the requested built-in theme when it exists', () => {
    const resolved = resolveActiveTheme({
      themeName: 'paper',
      defaultThemeName: 'tron',
      customThemes: [],
    });

    expect(resolved.name).toBe('paper');
    expect(resolved.colors.background).toBe('#F8F6F1');
  });

  it('returns a custom theme when the name matches one', () => {
    const resolved = resolveActiveTheme({
      themeName: 'custom',
      defaultThemeName: 'tron',
      customThemes: [customTheme],
    });

    expect(resolved).toEqual({ name: 'custom', colors: customTheme.colors });
  });

  it('falls back to the default theme when the name is unknown', () => {
    const resolved = resolveActiveTheme({
      themeName: 'ghost-theme',
      defaultThemeName: 'paper',
      customThemes: [],
    });

    expect(resolved.name).toBe('paper');
  });

  it('falls back to tron when both the requested and default names are unknown', () => {
    const resolved = resolveActiveTheme({
      themeName: 'ghost-theme',
      defaultThemeName: 'also-ghost',
      customThemes: [],
    });

    expect(resolved.name).toBe('tron');
  });
});

describe('themeImportPayloadSchema', () => {
  const validImport = {
    name: 'imported',
    colors: { background: '#000', primary: '#fff', accent: '#aaa' },
  };

  it('accepts a single theme entry', () => {
    expect(themeImportPayloadSchema.safeParse(validImport).success).toBe(true);
  });

  it('accepts an array of theme entries', () => {
    expect(themeImportPayloadSchema.safeParse([validImport, validImport]).success).toBe(true);
  });

  it('accepts a wrapped { themes: [...] } object', () => {
    expect(themeImportPayloadSchema.safeParse({ themes: [validImport] }).success).toBe(true);
  });

  it('rejects entries with invalid colors', () => {
    const result = themeImportPayloadSchema.safeParse({
      name: 'invalid',
      colors: { background: 'red', primary: '#fff', accent: '#000' },
    });

    expect(result.success).toBe(false);
  });
});
