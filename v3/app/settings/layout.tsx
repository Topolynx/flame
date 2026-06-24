import type { ReactNode } from 'react';

import { AuthButton } from '@/components/auth/AuthButton';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { ThemeApplier } from '@/components/themes/ThemeApplier';
import { Container } from '@/components/ui/Container';
import { Headline } from '@/components/ui/Headline';
import { isAuthenticated as _isAuthenticated } from '@/lib/auth';
import { getActiveTheme } from '@/lib/activeTheme';
import styles from './settings.module.css';
import { settingsNavItems } from './navItems';

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = await _isAuthenticated();
  const activeTheme = await getActiveTheme(null);

  return (
    <Container>
      <ThemeApplier theme={activeTheme} />

      <Headline title="Settings" linkToHome />

      <div className={styles.settings}>
        <aside data-flame="settings-sidebar">
          <SettingsNav items={settingsNavItems} />
          <AuthButton isAuthenticated={isAuthenticated} />
        </aside>
        <section className={styles.content}>{children}</section>
      </div>
    </Container>
  );
}
