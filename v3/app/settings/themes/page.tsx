import { listThemes } from '@/db/queries/themes';
import { isAuthenticated as _isAuthenticated } from '@/lib/auth';
import { getMergedConfig } from '@/lib/mergedConfig';
import { readFollowWorkspaceThemeCookie, readPreferredLocalThemeCookie } from '@/lib/themeCookie';
import { BUILT_IN_THEMES, resolveActiveTheme, type Theme } from '@/lib/themes';
import { ThemesSettings } from '@/components/settings/themes/ThemesSettings';

export default async function ThemesSettingsPage() {
  const { defaultTheme } = getMergedConfig();
  const isAuthenticated = await _isAuthenticated();
  const preferredLocalTheme = await readPreferredLocalThemeCookie();
  const followWorkspaceTheme = await readFollowWorkspaceThemeCookie();
  const customThemes = listThemes().filter(theme => theme.isCustom);
  const builtInThemes: Theme[] = BUILT_IN_THEMES.map(({ name, colors }) => ({
    name,
    colors,
    isCustom: false,
  }));

  const activeTheme = resolveActiveTheme({
    themeName: preferredLocalTheme ?? '',
    defaultThemeName: defaultTheme,
    customThemes,
  });

  return (
    <ThemesSettings
      builtInThemes={builtInThemes}
      customThemes={customThemes}
      activeThemeName={activeTheme.name}
      defaultThemeName={defaultTheme}
      isAuthenticated={isAuthenticated}
      hasLocalThemeOverride={preferredLocalTheme !== null}
      followWorkspaceTheme={followWorkspaceTheme}
    />
  );
}
