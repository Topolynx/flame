import { listWorkspaces } from '@/db/queries/workspaces';
import { WorkspacesSettings } from '@/components/settings/workspaces/WorkspacesSettings';

export default function WorkspacesSettingsPage() {
  const workspaces = listWorkspaces();

  return <WorkspacesSettings workspaces={workspaces} />;
}
