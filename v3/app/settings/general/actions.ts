'use server';

import { revalidatePath } from 'next/cache';

import { readGlobalConfigJson, writeGlobalConfigJson } from '@/db/queries/globalConfig';
import { globalOverridesSchema } from '@/lib/config';
import { validateConfigUpdate } from '@/lib/config-validateUpdate';
import { configLog } from '@/lib/logger';
import { requireAuth } from '@/lib/requireAuth';
import type { ServerActionResult } from '@/lib/serverAction';

export const updateGlobalConfig = requireAuth(
  async (updatedConfigKeys: unknown): Promise<ServerActionResult> => {
    const currentConfig = readGlobalConfigJson();
    const validationResult = validateConfigUpdate({
      updatedConfigKeys,
      currentConfig,
      schema: globalOverridesSchema,
    });

    if (!validationResult.success) {
      return { success: false, message: validationResult.message };
    }

    writeGlobalConfigJson(validationResult.newConfig);

    configLog.info(
      { keys: Object.keys(validationResult.validatedConfig) },
      'global config updated',
    );

    revalidatePath('/', 'layout');

    return { success: true, message: validationResult.message };
  },
);
