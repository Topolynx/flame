'use server';

import { revalidatePath } from 'next/cache';

import { readGlobalConfigJson, writeGlobalConfigJson } from '@/db/queries/globalConfig';
import {
  deleteThemeByName,
  getThemeByName,
  createTheme,
  listThemes,
  updateThemeByName,
} from '@/db/queries/themes';
import { globalOverridesSchema } from '@/lib/config';
import { validateConfigUpdate } from '@/lib/config-validateUpdate';
import { themesLog } from '@/lib/logger';
import { requireAuth } from '@/lib/requireAuth';
import type { ServerActionResult } from '@/lib/serverAction';
import {
  clearPreferredLocalThemeCookie,
  writeFollowWorkspaceThemeCookie,
  writePreferredLocalThemeCookie,
} from '@/lib/themeCookie';
import {
  isBuiltInThemeName,
  themeColorsSchema,
  themeImportPayloadSchema,
  themeNameSchema,
  type Theme,
  type ThemeColors,
  type ThemeImportEntry,
} from '@/lib/themes';

const ErrorResults = {
  INVALID_THEME_NAME: { success: false, message: 'Invalid theme name' },
  INVALID_COLORS: { success: false, message: 'Invalid colors' },
  THEME_NOT_FOUND: { success: false, message: 'Theme not found' },
  themeAlreadyExists: (name: string): ServerActionResult => ({
    success: false,
    message: `A theme named "${name}" already exists`,
  }),
} as const;

const revalidateThemedLayout = () => {
  revalidatePath('/', 'layout');
};

const parseColorsInput = (input: unknown): ThemeColors | null => {
  const result = themeColorsSchema.safeParse(input);
  return result.success ? result.data : null;
};

const parseNameInput = (input: unknown): string | null => {
  if (typeof input !== 'string') {
    return null;
  }

  const result = themeNameSchema.safeParse(input.trim());
  return result.success ? result.data : null;
};

export type CreateThemePayload = {
  name: unknown;
  colors: unknown;
};

export const createCustomTheme = requireAuth(
  async (theme: CreateThemePayload): Promise<ServerActionResult> => {
    const name = parseNameInput(theme.name);
    const colors = parseColorsInput(theme.colors);

    if (name === null) {
      return ErrorResults.INVALID_THEME_NAME;
    }

    if (colors === null) {
      return ErrorResults.INVALID_COLORS;
    }

    if (isBuiltInThemeName(name) || getThemeByName(name) !== null) {
      return ErrorResults.themeAlreadyExists(name);
    }

    createTheme({ name, colors, isCustom: true });

    themesLog.info({ name }, 'created custom theme');

    revalidateThemedLayout();

    return { success: true, message: 'Theme added' };
  },
);

export type UpdateThemePayload = CreateThemePayload & {
  originalName: unknown;
};

export const updateCustomTheme = requireAuth(
  async (input: UpdateThemePayload): Promise<ServerActionResult> => {
    const originalName = typeof input.originalName === 'string' ? input.originalName : null;
    const name = parseNameInput(input.name);
    const colors = parseColorsInput(input.colors);

    if (originalName === null || name === null) {
      return ErrorResults.INVALID_THEME_NAME;
    }

    if (colors === null) {
      return ErrorResults.INVALID_COLORS;
    }

    const theme = getThemeByName(originalName);

    if (theme === null) {
      return ErrorResults.THEME_NOT_FOUND;
    }

    if (!theme.isCustom) {
      return { success: false, message: 'Cannot edit built-in themes' };
    }

    if (name !== originalName && (isBuiltInThemeName(name) || getThemeByName(name) !== null)) {
      return ErrorResults.themeAlreadyExists(name);
    }

    updateThemeByName({ originalName, name, colors });

    themesLog.info({ originalName, name }, 'updated custom theme');

    revalidateThemedLayout();

    return { success: true, message: 'Theme updated' };
  },
);

export const deleteCustomTheme = requireAuth(async (name: unknown): Promise<ServerActionResult> => {
  if (typeof name !== 'string' || name.length === 0) {
    return ErrorResults.INVALID_THEME_NAME;
  }

  const theme = getThemeByName(name);

  if (theme === null) {
    return ErrorResults.THEME_NOT_FOUND;
  }

  if (!theme.isCustom) {
    return { success: false, message: 'Cannot delete built-in themes' };
  }

  deleteThemeByName(name);

  themesLog.info({ name }, 'deleted custom theme');

  revalidateThemedLayout();

  return { success: true, message: 'Theme deleted' };
});

export const clearPreferredLocalTheme = async (): Promise<ServerActionResult> => {
  await clearPreferredLocalThemeCookie();

  themesLog.info('preferred theme cookie cleared');

  revalidateThemedLayout();

  return { success: true, message: 'Local theme cleared' };
};

export const setFollowWorkspaceTheme = async (follow: unknown): Promise<ServerActionResult> => {
  if (typeof follow !== 'boolean') {
    return { success: false, message: 'Invalid value' };
  }

  await writeFollowWorkspaceThemeCookie(follow);

  themesLog.info({ follow }, 'follow-workspace-theme cookie updated');

  revalidateThemedLayout();

  return {
    success: true,
    message: follow ? 'Following workspace themes' : 'Using your local theme',
  };
};

export const setPreferredLocalTheme = async (themeName: unknown): Promise<ServerActionResult> => {
  if (typeof themeName !== 'string') {
    return ErrorResults.INVALID_THEME_NAME;
  }

  if (!isBuiltInThemeName(themeName) && getThemeByName(themeName) === null) {
    return ErrorResults.THEME_NOT_FOUND;
  }

  await writePreferredLocalThemeCookie(themeName);

  themesLog.info({ themeName }, 'preferred theme cookie set');

  revalidateThemedLayout();

  return { success: true, message: 'Theme applied' };
};

export const setDefaultTheme = requireAuth(
  async (themeName: unknown): Promise<ServerActionResult> => {
    if (typeof themeName !== 'string') {
      return ErrorResults.INVALID_THEME_NAME;
    }

    if (!isBuiltInThemeName(themeName) && getThemeByName(themeName) === null) {
      return ErrorResults.THEME_NOT_FOUND;
    }

    const currentConfig = readGlobalConfigJson();
    const validationResult = validateConfigUpdate({
      updatedConfigKeys: { defaultTheme: themeName },
      currentConfig,
      schema: globalOverridesSchema,
    });

    if (!validationResult.success) {
      return { success: false, message: validationResult.message };
    }

    writeGlobalConfigJson(validationResult.newConfig);

    themesLog.info({ themeName }, 'set default theme');

    revalidateThemedLayout();

    return { success: true, message: 'Default theme saved' };
  },
);

export type ImportThemesResult = ServerActionResult & { imported?: number; skipped?: string[] };

const normalizeImportPayload = (parsed: unknown): ThemeImportEntry[] | null => {
  const result = themeImportPayloadSchema.safeParse(parsed);

  if (!result.success) {
    return null;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if ('themes' in result.data) {
    return result.data.themes;
  }

  return [result.data];
};

export const importThemesFromJson = requireAuth(
  async (rawJson: unknown): Promise<ImportThemesResult> => {
    if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
      return { success: false, message: 'Provide a JSON payload to import' };
    }

    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
      return { success: false, message: 'Invalid JSON' };
    }

    const themes = normalizeImportPayload(parsedJson);

    if (themes === null) {
      return { success: false, message: 'JSON does not match expected theme shape' };
    }

    const skipped: string[] = [];
    let imported = 0;

    for (const { name, colors } of themes) {
      if (isBuiltInThemeName(name) || getThemeByName(name) !== null) {
        skipped.push(name);
        continue;
      }

      createTheme({ name, colors, isCustom: true });
      imported += 1;
    }

    themesLog.info({ imported, skipped: skipped.length }, 'imported themes');

    revalidateThemedLayout();

    return {
      success: true,
      message:
        skipped.length === 0
          ? `Imported ${imported} theme(s)`
          : `Imported ${imported} theme(s); skipped ${skipped.length} duplicate(s)`,
      imported,
      skipped,
    };
  },
);

export type ExportableTheme = Omit<Theme, 'isCustom'>;

export const exportThemesJson = async (scope: 'all' | 'custom' = 'custom'): Promise<string> => {
  const allThemes = listThemes();
  const filteredThemes =
    scope === 'custom' ? allThemes.filter(({ isCustom }) => isCustom) : allThemes;

  return JSON.stringify(
    { themes: filteredThemes.map<ExportableTheme>(({ name, colors }) => ({ name, colors })) },
    null,
    2,
  );
};
