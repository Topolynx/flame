'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { SettingsNavItem } from '@/app/settings/navItems';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from './SettingsNav.module.css';

export const SettingsNav = ({ items }: { items: SettingsNavItem[] }) => {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const visibleItems = isAuthenticated ? items : items.filter(item => !item.isAuthRequired);

  return (
    <nav className={styles.nav} data-flame="settings-nav">
      {visibleItems.map(item => {
        const isActive = pathname === item.href;
        const className = isActive ? `${styles.link} ${styles.linkActive}` : styles.link;

        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
};
