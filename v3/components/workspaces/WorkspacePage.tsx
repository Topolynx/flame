import { mdiCog } from '@mdi/js';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { ThemeApplier } from '@/components/themes/ThemeApplier';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { Message } from '@/components/ui/Message';
import type { MergedConfig } from '@/lib/config';
import type { ResolvedTheme } from '@/lib/themes';
import type { Workspace } from '@/lib/workspaces';
import styles from './WorkspacePage.module.css';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

type Props = {
  config: MergedConfig;
  workspace: Workspace;
  visibleWorkspaces: Workspace[];
  activeTheme: ResolvedTheme;
};

export const WorkspacePage = ({ config, workspace, visibleWorkspaces, activeTheme }: Props) => {
  return (
    <Container>
      <ThemeApplier theme={activeTheme} />

      <Header config={config} />

      <Message>
        Welcome to Flame! Go to <Link href="/settings/general">/settings/general</Link>, login and
        start customizing your new homepage
      </Message>

      <Link href="/settings" className={styles.settingsCog} aria-label="Open settings">
        <Icon path={mdiCog} />
      </Link>

      <WorkspaceSwitcher workspaces={visibleWorkspaces} activeWorkspaceId={workspace.id} />
    </Container>
  );
};
