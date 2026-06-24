'use client';

import { mdiCog, mdiPencil, mdiTrashCan } from '@mdi/js';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  createWorkspaceAction,
  deleteWorkspaceAction,
  updateWorkspaceAction,
} from '@/app/settings/workspaces/actions';
import { SettingsHeadline } from '@/components/settings/SettingsHeadline';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useServerAction } from '@/hooks/useServerAction';
import type { Workspace } from '@/lib/workspaces';
import { WorkspaceForm, type WorkspaceFormValues } from './WorkspaceForm';
import styles from './WorkspacesSettings.module.css';

type ModalState = { mode: 'create' } | { mode: 'edit'; workspace: Workspace } | null;

export const WorkspacesSettings = ({ workspaces }: { workspaces: Workspace[] }) => {
  const { isSubmitting, runServerAction } = useServerAction();
  const [modalState, setModalState] = useState<ModalState>(null);
  const searchParams = useSearchParams();

  const nonDefaultWorkspaces = useMemo(
    () =>
      workspaces
        .filter(({ isDefault }) => !isDefault)
        .sort((firstWorkspace, secondWorkspace) =>
          firstWorkspace.name.localeCompare(secondWorkspace.name),
        ),
    [workspaces],
  );

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setModalState({ mode: 'create' });
    }
  }, [searchParams]);

  const closeModal = () => setModalState(null);

  const handleCreate = async ({ name, slug, isPublic }: WorkspaceFormValues) => {
    await runServerAction(() => createWorkspaceAction({ name, slug, isPublic }), {
      onSuccess: closeModal,
    });
  };

  const handleEdit =
    (workspace: Workspace) =>
    async ({ name, slug, isPublic }: WorkspaceFormValues) => {
      await runServerAction(
        () => updateWorkspaceAction({ id: workspace.id, name, slug, isPublic }),
        { onSuccess: closeModal },
      );
    };

  const handleDelete = async (workspace: Workspace) => {
    if (!window.confirm(`Delete workspace "${workspace.name}"?`)) {
      return;
    }

    await runServerAction(() => deleteWorkspaceAction(workspace.id));
  };

  return (
    <div>
      <SettingsHeadline>Workspaces</SettingsHeadline>

      {nonDefaultWorkspaces.length === 0 ? (
        <p className={styles.emptyState}>
          Only the default workspace exists. Create one below to start grouping items.
        </p>
      ) : (
        <ul className={styles.list}>
          {nonDefaultWorkspaces.map(workspace => {
            const { id, name, slug, isPublic } = workspace;

            return (
              <li key={id} className={styles.item}>
                <div className={styles.identity}>
                  <span className={styles.name}>{name}</span>
                  <span className={styles.meta}>
                    /{slug ?? ''}
                    {' - '}
                    {isPublic ? 'public' : 'private'}
                  </span>
                </div>

                <div className={styles.actions}>
                  <Link
                    href={`/settings/workspaces/${id}`}
                    className={styles.iconAction}
                    aria-label={`Open ${name} settings`}
                    title="Workspace settings"
                  >
                    <Icon path={mdiCog} />
                  </Link>

                  <Button
                    onClick={() => setModalState({ mode: 'edit', workspace })}
                    disabled={isSubmitting}
                    className={styles.iconAction}
                    aria-label={`Edit ${name}`}
                    title="Edit name, slug or visibility"
                  >
                    <Icon path={mdiPencil} />
                  </Button>

                  <Button
                    onClick={() => handleDelete(workspace)}
                    disabled={isSubmitting}
                    className={styles.iconAction}
                    aria-label={`Delete ${name}`}
                    title="Delete workspace"
                  >
                    <Icon path={mdiTrashCan} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.createButtonRow}>
        <Button onClick={() => setModalState({ mode: 'create' })} disabled={isSubmitting}>
          Create workspace
        </Button>
      </div>

      <Modal isOpen={modalState !== null} onClose={closeModal}>
        {modalState?.mode === 'create' ? (
          <WorkspaceForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
        ) : null}

        {modalState?.mode === 'edit' ? (
          <WorkspaceForm
            initialWorkspace={modalState.workspace}
            onSubmit={handleEdit(modalState.workspace)}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </Modal>
    </div>
  );
};
