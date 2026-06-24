'use client';

import Link from 'next/link';
import { useState, type SyntheticEvent } from 'react';

import { updateWorkspaceConfigAction } from '@/app/settings/workspaces/actions';
import { SelectField } from '@/components/settings/SelectField';
import { SettingsHeadline } from '@/components/settings/SettingsHeadline';
import { NULL_VALUE, TernaryBooleanField } from '@/components/settings/TernaryBooleanField';
import { TextField } from '@/components/settings/TextField';
import { Button } from '@/components/ui/Button';
import { useServerAction } from '@/hooks/useServerAction';
import type { UnvalidatedConfig, WorkspaceOverrides } from '@/lib/config';
import type { Theme } from '@/lib/themes';
import type { Workspace } from '@/lib/workspaces';

type Props = {
  workspace: Workspace;
  overrides: UnvalidatedConfig;
  themes: Theme[];
};

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readBoolean = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

export const WorkspaceConfigForm = ({ workspace, overrides, themes }: Props) => {
  const { isSubmitting, runServerAction } = useServerAction();

  const [theme, setTheme] = useState(readString(overrides.theme));

  const themeOptions = [
    { value: NULL_VALUE, label: 'Inherit global default' },
    ...themes.map(({ name, isCustom }) => ({
      value: name,
      label: isCustom ? `+ ${name}` : name,
    })),
  ];

  const [customTitle, setCustomTitle] = useState(readString(overrides.customTitle));
  const [hideHeader, setHideHeader] = useState<boolean | null>(readBoolean(overrides.hideHeader));
  const [hideSearch, setHideSearch] = useState<boolean | null>(readBoolean(overrides.hideSearch));
  const [hideApps, setHideApps] = useState<boolean | null>(readBoolean(overrides.hideApps));
  const [hideBookmarks, setHideBookmarks] = useState<boolean | null>(
    readBoolean(overrides.hideBookmarks),
  );

  const buildPayload = (): WorkspaceOverrides => {
    const payload: WorkspaceOverrides = {};

    if (theme.trim().length > 0) {
      payload.theme = theme.trim();
    }

    if (customTitle.length > 0) {
      payload.customTitle = customTitle;
    }

    if (hideHeader !== null) {
      payload.hideHeader = hideHeader;
    }

    if (hideSearch !== null) {
      payload.hideSearch = hideSearch;
    }

    if (hideApps !== null) {
      payload.hideApps = hideApps;
    }

    if (hideBookmarks !== null) {
      payload.hideBookmarks = hideBookmarks;
    }

    return payload;
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    await runServerAction(() =>
      updateWorkspaceConfigAction({
        id: workspace.id,
        updatedConfigKeys: buildPayload(),
      }),
    );
  };

  return (
    <div>
      <SettingsHeadline>{workspace.name} - Workspace settings</SettingsHeadline>

      <p>
        <Link href="/settings/workspaces">Back to workspaces</Link>
      </p>

      <form onSubmit={handleSubmit}>
        <SettingsHeadline>General</SettingsHeadline>

        <SelectField
          id="theme"
          label="Theme override"
          value={theme.length > 0 ? theme : NULL_VALUE}
          onChange={value => setTheme(value === NULL_VALUE ? '' : value)}
          options={themeOptions}
          disabled={isSubmitting}
        />

        <TextField
          id="customTitle"
          label="Custom title override"
          value={customTitle}
          onChange={setCustomTitle}
          placeholder="Leave blank to inherit"
          disabled={isSubmitting}
        />

        <SettingsHeadline>Visibility overrides</SettingsHeadline>

        <TernaryBooleanField
          id="hideHeader"
          label="Hide header"
          value={hideHeader}
          onChange={setHideHeader}
          trueLabel="Hide"
          falseLabel="Show"
          disabled={isSubmitting}
        />

        <TernaryBooleanField
          id="hideSearch"
          label="Hide search bar"
          value={hideSearch}
          onChange={setHideSearch}
          trueLabel="Hide"
          falseLabel="Show"
          disabled={isSubmitting}
        />

        <TernaryBooleanField
          id="hideApps"
          label="Hide apps"
          value={hideApps}
          onChange={setHideApps}
          trueLabel="Hide"
          falseLabel="Show"
          disabled={isSubmitting}
        />

        <TernaryBooleanField
          id="hideBookmarks"
          label="Hide bookmarks"
          value={hideBookmarks}
          onChange={setHideBookmarks}
          trueLabel="Hide"
          falseLabel="Show"
          disabled={isSubmitting}
        />

        <Button type="submit" disabled={isSubmitting}>
          Save changes
        </Button>
      </form>
    </div>
  );
};
