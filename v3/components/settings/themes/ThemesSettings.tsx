'use client';

import { useState, type SyntheticEvent } from 'react';

import {
  createCustomTheme,
  deleteCustomTheme,
  exportThemesJson,
  importThemesFromJson,
  setDefaultTheme,
  setPreferredLocalTheme,
  updateCustomTheme,
} from '@/app/settings/themes/actions';
import { SelectField } from '@/components/settings/SelectField';
import { SettingsHeadline } from '@/components/settings/SettingsHeadline';
import { useToast } from '@/components/toast/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useServerAction } from '@/hooks/useServerAction';
import type { Theme } from '@/lib/themes';
import { ThemeEditorList } from './ThemeEditorList';
import { ThemeForm, type ThemeFormSubmit } from './ThemeForm';
import { ThemeGrid } from './ThemeGrid';
import styles from './ThemesSettings.module.css';

type Props = {
  builtInThemes: Theme[];
  customThemes: Theme[];
  activeThemeName: string;
  defaultThemeName: string;
  isAuthenticated: boolean;
};

type ModalMode =
  | { mode: 'create' }
  | { mode: 'edit'; theme: Theme }
  | { mode: 'editorList' }
  | null;

export const ThemesSettings = ({
  builtInThemes,
  customThemes,
  activeThemeName,
  defaultThemeName,
  isAuthenticated,
}: Props) => {
  const toast = useToast();
  const { isSubmitting, runServerAction } = useServerAction();
  const [modalState, setModalState] = useState<ModalMode>(null);
  const [payload, setPayload] = useState('');
  const [pendingDefaultTheme, setPendingDefaultTheme] = useState(defaultThemeName);

  const allThemes = [...builtInThemes, ...customThemes];

  const closeModal = () => setModalState(null);

  const handleApplyTheme = async (theme: Theme) => {
    if (isSubmitting) {
      return;
    }

    await runServerAction(() => setPreferredLocalTheme(theme.name), { silentOnSuccess: true });
  };

  const handleCreateTheme = async ({ name, colors }: ThemeFormSubmit) => {
    await runServerAction(() => createCustomTheme({ name, colors }), { onSuccess: closeModal });
  };

  const handleEditTheme =
    (originalName: string) =>
    async ({ name, colors }: ThemeFormSubmit) => {
      await runServerAction(() => updateCustomTheme({ originalName, name, colors }), {
        onSuccess: closeModal,
      });
    };

  const handleDeleteTheme = async (theme: Theme) => {
    if (!window.confirm(`Delete theme "${theme.name}"?`)) {
      return;
    }

    await runServerAction(() => deleteCustomTheme(theme.name), {
      onSuccess: () => {
        if (customThemes.length <= 1) {
          closeModal();
        }
      },
    });
  };

  const handleSetDefaultTheme = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runServerAction(() => setDefaultTheme(pendingDefaultTheme));
  };

  const handleImportThemes = async () => {
    await runServerAction(() => importThemesFromJson(payload), {
      onSuccess: () => setPayload(''),
    });
  };

  const handleExportThemes = async () => {
    const json = await exportThemesJson('custom');

    setPayload(json);

    if (json.length > 0) {
      toast.info('Custom themes loaded into the textarea');
    }
  };

  return (
    <div>
      <SettingsHeadline>App themes</SettingsHeadline>
      <div className={styles.section}>
        <ThemeGrid
          themes={builtInThemes}
          activeThemeName={activeThemeName}
          onSelect={handleApplyTheme}
        />
      </div>

      {customThemes.length > 0 || isAuthenticated ? (
        <>
          <SettingsHeadline>Custom themes</SettingsHeadline>
          <div className={styles.section}>
            {customThemes.length > 0 && (
              <ThemeGrid
                themes={customThemes}
                activeThemeName={activeThemeName}
                onSelect={handleApplyTheme}
              />
            )}

            {isAuthenticated && (
              <div className={styles.buttonsRow}>
                <Button onClick={() => setModalState({ mode: 'create' })}>Create new theme</Button>
                {customThemes.length > 0 && (
                  <Button onClick={() => setModalState({ mode: 'editorList' })}>
                    Edit custom themes
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}

      {isAuthenticated ? (
        <>
          <SettingsHeadline>Import / Export</SettingsHeadline>
          <div className={styles.section}>
            <textarea
              className={styles.payloadTextarea}
              placeholder='Paste theme JSON here to import, or click "Export custom themes" to fill with the current themes.'
              value={payload}
              onChange={event => setPayload(event.target.value)}
              disabled={isSubmitting}
            />
            <div className={styles.buttonsRow}>
              <Button
                onClick={handleImportThemes}
                disabled={isSubmitting || payload.trim().length === 0}
              >
                Import themes
              </Button>
              <Button onClick={handleExportThemes} disabled={isSubmitting}>
                Export custom themes
              </Button>
            </div>
          </div>

          <form onSubmit={handleSetDefaultTheme}>
            <SettingsHeadline>Other settings</SettingsHeadline>
            <SelectField
              id="defaultTheme"
              label="Default theme for new users"
              value={pendingDefaultTheme}
              onChange={setPendingDefaultTheme}
              options={allThemes.map(({ name, isCustom }) => ({
                value: name,
                label: isCustom ? `+ ${name}` : name,
              }))}
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting}>
              Save changes
            </Button>
          </form>
        </>
      ) : null}

      <Modal isOpen={modalState !== null} onClose={closeModal}>
        {modalState?.mode === 'create' ? (
          <ThemeForm onSubmit={handleCreateTheme} isSubmitting={isSubmitting} />
        ) : null}

        {modalState?.mode === 'edit' ? (
          <ThemeForm
            initialTheme={modalState.theme}
            onSubmit={handleEditTheme(modalState.theme.name)}
            isSubmitting={isSubmitting}
          />
        ) : null}

        {modalState?.mode === 'editorList' ? (
          <ThemeEditorList
            themes={customThemes}
            onEdit={theme => setModalState({ mode: 'edit', theme })}
            onDelete={handleDeleteTheme}
          />
        ) : null}
      </Modal>
    </div>
  );
};
