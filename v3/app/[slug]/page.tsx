import { notFound } from 'next/navigation';

import { WorkspacePage } from '@/components/workspaces/WorkspacePage';
import { getWorkspaceBySlug, listWorkspaces } from '@/db/queries/workspaces';
import { isAuthenticated as _isAuthenticated } from '@/lib/auth';
import { getActiveTheme } from '@/lib/activeTheme';
import { getMergedConfig } from '@/lib/mergedConfig';
import { filterVisibleWorkspaces, isReservedWorkspaceSlug } from '@/lib/workspaces';

export default async function WorkspaceSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (isReservedWorkspaceSlug(slug)) {
    notFound();
  }

  const workspace = getWorkspaceBySlug(slug);

  if (workspace === null) {
    notFound();
  }

  const isAuthenticated = await _isAuthenticated();

  if (!workspace.isPublic && !isAuthenticated) {
    notFound();
  }

  const config = getMergedConfig(workspace.id);
  const visibleWorkspaces = filterVisibleWorkspaces(listWorkspaces(), isAuthenticated);
  const activeTheme = await getActiveTheme(workspace.id);

  return (
    <WorkspacePage
      config={config}
      workspace={workspace}
      visibleWorkspaces={visibleWorkspaces}
      activeTheme={activeTheme}
    />
  );
}
