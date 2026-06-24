import { NextResponse, type NextRequest } from 'next/server';

import { isAuthDisabled, SESSION_COOKIE } from '@/lib/auth';
import { verifySession } from '@/lib/jwt';

export const PATHNAME_HEADER = 'x-flame-pathname';

const PUBLIC_SETTINGS_PATHS = new Set(['/settings', '/settings/themes']);

const withPathnameHeader = (request: NextRequest): NextResponse => {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
};

const isSettingsPath = (pathname: string): boolean => pathname.startsWith('/settings');

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const { pathname } = request.nextUrl;

  if (isAuthDisabled() || !isSettingsPath(pathname) || PUBLIC_SETTINGS_PATHS.has(pathname)) {
    return withPathnameHeader(request);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;

  if (payload) {
    return withPathnameHeader(request);
  }

  const url = request.nextUrl.clone();

  url.pathname = '/login';
  url.searchParams.set('next', pathname);

  return NextResponse.redirect(url);
};

export const config = {
  matcher: ['/((?!api|_next/|favicon\\.ico|icons/|.*\\.[^/]+$).*)'],
};
