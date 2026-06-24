import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { headers } from 'next/headers';

import { Providers } from '@/components/providers/Providers';
import { getWorkspaceBySlug } from '@/db/queries/workspaces';
import { PATHNAME_HEADER } from '@/proxy';
import { isAuthenticated as _isAuthenticated } from '@/lib/auth';
import { getActiveTheme } from '@/lib/activeTheme';
import { buildRootThemeCss } from '@/lib/themes';
import { extractWorkspaceSlugFromPath } from '@/lib/workspaces';

import './globals.css';

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
});

export const metadata: Metadata = {
  title: 'Flame',
  description: 'Flame - self-hosted startpage for your server',
  icons: {
    icon: '/icons/favicon.ico',
    apple: [
      { url: '/icons/apple-touch-icon.png' },
      { url: '/icons/apple-touch-icon-57x57.png', sizes: '57x57' },
      { url: '/icons/apple-touch-icon-72x72.png', sizes: '72x72' },
      { url: '/icons/apple-touch-icon-76x76.png', sizes: '76x76' },
      { url: '/icons/apple-touch-icon-114x114.png', sizes: '114x114' },
      { url: '/icons/apple-touch-icon-120x120.png', sizes: '120x120' },
      { url: '/icons/apple-touch-icon-144x144.png', sizes: '144x144' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

const resolveInitialWorkspaceId = async (): Promise<number | null> => {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? '';
  const slug = extractWorkspaceSlugFromPath(pathname);

  if (slug === null) {
    return null;
  }

  const workspace = getWorkspaceBySlug(slug);

  return workspace?.id ?? null;
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialWorkspaceId = await resolveInitialWorkspaceId();
  const activeTheme = await getActiveTheme(initialWorkspaceId);
  const isAuthenticated = await _isAuthenticated();

  return (
    <html lang="en" className={roboto.variable} data-theme={activeTheme.name}>
      <body>
        <style
          data-flame="active-theme"
          dangerouslySetInnerHTML={{ __html: buildRootThemeCss(activeTheme.colors) }}
        />
        <Providers isAuthenticated={isAuthenticated}>{children}</Providers>
      </body>
    </html>
  );
}
