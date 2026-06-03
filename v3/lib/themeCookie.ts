import { cookies } from 'next/headers';

export const THEME_COOKIE = 'flame_theme';

const THEME_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const readPreferredLocalThemeCookie = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE)?.value;

  return value && value.length > 0 ? value : null;
};

export const writePreferredLocalThemeCookie = async (themeName: string): Promise<void> => {
  const cookieStore = await cookies();

  cookieStore.set(THEME_COOKIE, themeName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
  });
};
