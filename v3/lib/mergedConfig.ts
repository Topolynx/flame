import { readGlobalConfigJson } from '@/db/queries/globalConfig';
import { readWorkspaceConfigJson } from '@/db/queries/workspaces';
import { buildMergedConfig, type MergedConfig } from './config';

export const getMergedConfig = (workspaceId?: number | null): MergedConfig => {
  const workspaceOverrides = workspaceId == null ? null : readWorkspaceConfigJson(workspaceId);

  return buildMergedConfig({
    globalConfig: readGlobalConfigJson(),
    workspaceOverrides,
  });
};
