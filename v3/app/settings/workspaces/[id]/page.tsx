import { notFound } from 'next/navigation';

import { WorkspaceConfigForm } from '@/components/settings/workspaces/WorkspaceConfigForm';
import { listThemes } from '@/db/queries/themes';
import { getWorkspaceById, readWorkspaceConfigJson } from '@/db/queries/workspaces';
import { BUILT_IN_THEMES, type Theme } from '@/lib/themes';

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const workspaceId = Number.parseInt(rawId);

  if (!Number.isFinite(workspaceId)) {
    notFound();
  }

  const workspace = getWorkspaceById(workspaceId);

  if (workspace === null || workspace.isDefault) {
    notFound();
  }

  const overrides = readWorkspaceConfigJson(workspaceId) ?? {};

  const customThemes = listThemes().filter(({ isCustom }) => isCustom);
  const builtInThemes: Theme[] = BUILT_IN_THEMES.map(({ name, colors }) => ({
    name,
    colors,
    isCustom: false,
  }));

  return (
    <WorkspaceConfigForm
      workspace={workspace}
      overrides={overrides}
      themes={[...builtInThemes, ...customThemes]}
    />
  );
}
