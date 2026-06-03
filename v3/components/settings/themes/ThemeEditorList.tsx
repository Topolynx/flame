'use client';

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
            <button type="button" className={styles.actionButton} onClick={() => onEdit(theme)}>
              Edit
            </button>
            <button type="button" className={styles.actionButton} onClick={() => onDelete(theme)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};
