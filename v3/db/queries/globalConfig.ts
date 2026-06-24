import { eq } from 'drizzle-orm';

import { db, type DbClient } from '@/db';
import { globalConfig } from '@/db/schema/globalConfig';
import { parseUnvalidatedConfigJson, type UnvalidatedConfig } from '@/lib/config';
import { configLog } from '@/lib/logger';

export const GLOBAL_CONFIG_ID = 1;

export const readGlobalConfigJson = (client: DbClient = db): UnvalidatedConfig => {
  const row = client
    .select({ configJson: globalConfig.configJson })
    .from(globalConfig)
    .where(eq(globalConfig.id, GLOBAL_CONFIG_ID))
    .get();

  if (row === undefined) {
    return {};
  }

  return parseUnvalidatedConfigJson(row.configJson, {
    log: configLog,
    message: 'global_config row contained invalid JSON; treating as empty',
  });
};

export const writeGlobalConfigJson = (
  newConfig: UnvalidatedConfig,
  client: DbClient = db,
): void => {
  const configJson = JSON.stringify(newConfig);
  const updatedAt = Date.now();

  client
    .insert(globalConfig)
    .values({ id: GLOBAL_CONFIG_ID, configJson, updatedAt })
    .onConflictDoUpdate({
      target: globalConfig.id,
      set: { configJson, updatedAt },
    })
    .run();
};
