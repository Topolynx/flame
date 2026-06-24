'use client';

import { mdiViewDashboard } from '@mdi/js';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { sortWorkspacesForSwitcher, getWorkspaceHref, type Workspace } from '@/lib/workspaces';
import styles from './WorkspaceSwitcher.module.css';

type Props = {
  workspaces: Workspace[];
  activeWorkspaceId: number;
};

export const WorkspaceSwitcher = ({ workspaces, activeWorkspaceId }: Props) => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (workspaces.length <= 1) {
    return null;
  }

  const sortedWorkspaces = sortWorkspacesForSwitcher(workspaces);

  return (
    <div className={styles.switcher} ref={containerRef} data-flame="workspace-switcher">
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsOpen(open => !open)}
        aria-label="Switch workspace"
        aria-expanded={isOpen}
      >
        <Icon path={mdiViewDashboard} />
      </button>

      {isOpen ? (
        <div className={styles.popover} role="menu">
          <ul className={styles.list}>
            {sortedWorkspaces.map(workspace => {
              const isActive = workspace.id === activeWorkspaceId;
              const className = isActive ? `${styles.item} ${styles.itemActive}` : styles.item;

              return (
                <li key={workspace.id}>
                  <Link
                    href={getWorkspaceHref(workspace)}
                    className={className}
                    onClick={() => setIsOpen(false)}
                    role="menuitem"
                  >
                    {workspace.name}
                  </Link>
                </li>
              );
            })}
          </ul>

          {isAuthenticated ? (
            <div className={styles.footer}>
              <Link
                href="/settings/workspaces?action=create"
                className={styles.footerLink}
                onClick={() => setIsOpen(false)}
              >
                + New workspace
              </Link>
              <Link
                href="/settings/workspaces"
                className={styles.footerLink}
                onClick={() => setIsOpen(false)}
              >
                Manage workspaces…
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
