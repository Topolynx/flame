import { z } from 'zod';

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const themeColorsSchema = z.object({
  background: z.string().regex(HEX_COLOR_REGEX, 'must be a hex color'),
  primary: z.string().regex(HEX_COLOR_REGEX, 'must be a hex color'),
  accent: z.string().regex(HEX_COLOR_REGEX, 'must be a hex color'),
});

export type ThemeColors = z.infer<typeof themeColorsSchema>;

export const THEME_NAME_REGEX = /^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/;

export const themeNameSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(
    THEME_NAME_REGEX,
    'must be lowercase letters, digits, hyphens or underscores (cannot start or end with a separator)',
  );

export type Theme = {
  name: string;
  colors: ThemeColors;
  isCustom: boolean;
};

export const BUILT_IN_THEMES: ReadonlyArray<Omit<Theme, 'isCustom'>> = [
  { name: 'blackboard', colors: { background: '#1a1a1a', primary: '#FFFDEA', accent: '#5c5c5c' } },
  { name: 'gazette', colors: { background: '#F2F7FF', primary: '#000000', accent: '#5c5c5c' } },
  { name: 'espresso', colors: { background: '#21211F', primary: '#D1B59A', accent: '#4E4E4E' } },
  { name: 'cab', colors: { background: '#F6D305', primary: '#1F1F1F', accent: '#424242' } },
  { name: 'cloud', colors: { background: '#f1f2f0', primary: '#35342f', accent: '#37bbe4' } },
  { name: 'lime', colors: { background: '#263238', primary: '#AABBC3', accent: '#aeea00' } },
  { name: 'white', colors: { background: '#ffffff', primary: '#222222', accent: '#dddddd' } },
  { name: 'tron', colors: { background: '#242B33', primary: '#EFFBFF', accent: '#6EE2FF' } },
  { name: 'blues', colors: { background: '#2B2C56', primary: '#EFF1FC', accent: '#6677EB' } },
  { name: 'passion', colors: { background: '#f5f5f5', primary: '#12005e', accent: '#8e24aa' } },
  { name: 'chalk', colors: { background: '#263238', primary: '#AABBC3', accent: '#FF869A' } },
  { name: 'paper', colors: { background: '#F8F6F1', primary: '#4C432E', accent: '#AA9A73' } },
  { name: 'neon', colors: { background: '#091833', primary: '#EFFBFF', accent: '#ea00d9' } },
  { name: 'pumpkin', colors: { background: '#2d3436', primary: '#EFFBFF', accent: '#ffa500' } },
  { name: 'onedark', colors: { background: '#282c34', primary: '#dfd9d6', accent: '#98c379' } },
  { name: 'mint', colors: { background: '#282525', primary: '#d9d9d9', accent: '#50fbc2' } },
];

export const isBuiltInThemeName = (name: string): boolean =>
  BUILT_IN_THEMES.some(theme => theme.name === name);

export const themeImportEntrySchema = z.object({
  name: themeNameSchema,
  colors: themeColorsSchema,
});

export const themeImportPayloadSchema = z.union([
  themeImportEntrySchema,
  z.array(themeImportEntrySchema),
  z.object({ themes: z.array(themeImportEntrySchema) }),
]);

export type ThemeImportEntry = z.infer<typeof themeImportEntrySchema>;

export const buildRootThemeCss = ({ background, primary, accent }: ThemeColors): string =>
  `:root {\n` +
  `  --color-background: ${background};\n` +
  `  --color-primary: ${primary};\n` +
  `  --color-accent: ${accent};\n` +
  `}`;

export type ResolvedTheme = Omit<Theme, 'isCustom'>;

const FALLBACK_THEME_NAME = 'tron';

export const resolveActiveTheme = ({
  themeName,
  defaultThemeName,
  customThemes,
}: {
  themeName: string;
  defaultThemeName: string;
  customThemes: ReadonlyArray<Theme>;
}): ResolvedTheme => {
  const allThemes: ReadonlyArray<ResolvedTheme> = [...BUILT_IN_THEMES, ...customThemes].map(
    ({ name, colors }) => ({ name, colors }),
  );

  const findByName = (name: string) => allThemes.find(theme => theme.name === name);

  return findByName(themeName) ?? findByName(defaultThemeName) ?? findByName(FALLBACK_THEME_NAME)!;
};
