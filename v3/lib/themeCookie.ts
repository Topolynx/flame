import { cookies } from 'next/headers';

export const THEME_COOKIE = 'flame_theme';
export const FOLLOW_WORKSPACE_THEME_COOKIE = 'flame_follow_workspace_theme';

const THEME_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
};

export const readPreferredLocalThemeCookie = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE)?.value;

  return value && value.length > 0 ? value : null;
};

export const writePreferredLocalThemeCookie = async (themeName: string): Promise<void> => {
  const cookieStore = await cookies();

  cookieStore.set(THEME_COOKIE, themeName, cookieOptions);
};

export const clearPreferredLocalThemeCookie = async (): Promise<void> => {
  const cookieStore = await cookies();

  cookieStore.delete(THEME_COOKIE);
};

export const readFollowWorkspaceThemeCookie = async (): Promise<boolean> => {
  const cookieStore = await cookies();

  return cookieStore.get(FOLLOW_WORKSPACE_THEME_COOKIE)?.value !== 'false';
};

export const writeFollowWorkspaceThemeCookie = async (shouldFollow: boolean): Promise<void> => {
  const cookieStore = await cookies();

  // default is on (follow theme)
  // if cookie is present it means that user opted out of following workspace theme
  // lack of cookie == following workspace theme
  if (shouldFollow) {
    cookieStore.delete(FOLLOW_WORKSPACE_THEME_COOKIE);
  } else {
    cookieStore.set(FOLLOW_WORKSPACE_THEME_COOKIE, 'false', cookieOptions);
  }
};
