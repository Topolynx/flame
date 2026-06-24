'use client';

import { mdiPencil, mdiTrashCan } from '@mdi/js';

import { Icon } from '@/components/ui/Icon';
import type { Theme } from '@/lib/themes';
import styles from './ThemeEditorList.module.css';

type Props = {
  themes: Theme[];
  onEdit: (theme: Theme) => void;
  onDelete: (theme: Theme) => void;
};

export const ThemeEditorList = ({ themes, onEdit, onDelete }: Props) => {
  return (
    <ul className={styles.editorList}>
      {themes.map(theme => (
        <li key={theme.name} className={styles.editorRow}>
          <span>{theme.name}</span>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconAction}
              onClick={() => onEdit(theme)}
              aria-label={`Edit ${theme.name}`}
              title="Edit theme colors"
            >
              <Icon path={mdiPencil} />
            </button>
            <button
              type="button"
              className={styles.iconAction}
              onClick={() => onDelete(theme)}
              aria-label={`Delete ${theme.name}`}
              title="Delete theme"
            >
              <Icon path={mdiTrashCan} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};
