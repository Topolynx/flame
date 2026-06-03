import { asc, eq } from 'drizzle-orm';

import { db, type DbClient } from '@/db';
import { themes, type ThemeRow } from '@/db/schema/themes';
import { BUILT_IN_THEMES, themeColorsSchema, type Theme, type ThemeColors } from '@/lib/themes';
import { themesLog } from '@/lib/logger';

const parseColors = (colorsJson: string, themeName: string): ThemeColors | null => {
  try {
    const parsedColors = JSON.parse(colorsJson) as unknown;
    const validationResult = themeColorsSchema.safeParse(parsedColors);

    if (validationResult.success) {
      return validationResult.data;
    }

    themesLog.warn({ themeName }, 'theme row had invalid colors_json; skipping');
  } catch {
    themesLog.warn({ themeName }, 'theme row had non-JSON colors_json; skipping');
  }

  return null;
};

const rowToTheme = ({ name, colorsJson, isCustom }: ThemeRow): Theme | null => {
  const colors = parseColors(colorsJson, name);

  if (colors === null) {
    return null;
  }

  return { name, colors, isCustom };
};

export const listThemes = (client: DbClient = db): Theme[] => {
  const rows = client.select().from(themes).orderBy(asc(themes.name)).all();

  return rows.flatMap(row => {
    const theme = rowToTheme(row);
    return theme === null ? [] : [theme];
  });
};

export const getThemeByName = (name: string, client: DbClient = db): Theme | null => {
  const row = client.select().from(themes).where(eq(themes.name, name)).get();

  if (row === undefined) {
    return null;
  }

  return rowToTheme(row);
};

export type CreateThemePayload = {
  name: string;
  colors: ThemeColors;
  isCustom: boolean;
};

export const createTheme = (
  { name, colors, isCustom }: CreateThemePayload,
  client: DbClient = db,
): void => {
  const now = Date.now();

  client
    .insert(themes)
    .values({
      name,
      colorsJson: JSON.stringify(colors),
      isCustom,
      createdAt: now,
      updatedAt: now,
    })
    .run();
};

export type UpdateThemePayload = {
  originalName: string;
  name: string;
  colors: ThemeColors;
};

export const updateThemeByName = (
  { name, colors, originalName }: UpdateThemePayload,
  client: DbClient = db,
): void => {
  client
    .update(themes)
    .set({
      name,
      colorsJson: JSON.stringify(colors),
      updatedAt: Date.now(),
    })
    .where(eq(themes.name, originalName))
    .run();
};

export const deleteThemeByName = (name: string, client: DbClient = db): void => {
  client.delete(themes).where(eq(themes.name, name)).run();
};

export const seedBuiltInThemes = (client: DbClient = db): number => {
  const now = Date.now();
  let insertedCount = 0;

  for (const { name, colors } of BUILT_IN_THEMES) {
    const result = client
      .insert(themes)
      .values({
        name,
        colorsJson: JSON.stringify(colors),
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: themes.name })
      .run();

    if (result.changes > 0) {
      insertedCount += 1;
    }
  }

  if (insertedCount > 0) {
    themesLog.info({ insertedCount }, 'seeded built-in themes');
  }

  return insertedCount;
};
