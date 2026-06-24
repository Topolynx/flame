import { listThemes } from '@/db/queries/themes';
import { readWorkspaceConfigJson } from '@/db/queries/workspaces';
import { getMergedConfig } from '@/lib/mergedConfig';
import { readFollowWorkspaceThemeCookie, readPreferredLocalThemeCookie } from '@/lib/themeCookie';
import { pickActiveThemeName, resolveActiveTheme, type ResolvedTheme } from '@/lib/themes';

const readWorkspaceThemeOverride = (workspaceId: number | null): string | null => {
  if (workspaceId === null) {
    return null;
  }

  const overrides = readWorkspaceConfigJson(workspaceId) ?? {};
  const theme = overrides.theme;

  return typeof theme === 'string' && theme.length > 0 ? theme : null;
};

export const getActiveTheme = async (workspaceId: number | null): Promise<ResolvedTheme> => {
  const defaultThemeName = getMergedConfig().defaultTheme;

  const [preferredLocalTheme, followWorkspaceTheme] = await Promise.all([
    readPreferredLocalThemeCookie(),
    readFollowWorkspaceThemeCookie(),
  ]);

  const workspaceTheme = readWorkspaceThemeOverride(workspaceId);
  const customThemes = listThemes().filter(({ isCustom }) => isCustom);

  const activeThemeName = pickActiveThemeName({
    preferredLocalTheme,
    followWorkspaceTheme,
    workspaceTheme,
    globalDefaultTheme: defaultThemeName,
  });

  return resolveActiveTheme({
    themeName: activeThemeName,
    defaultThemeName,
    customThemes,
  });
};
