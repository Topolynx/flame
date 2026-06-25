'use client';

import { memo } from 'react';

import { Icon } from '@/components/ui/Icon';
import styles from './IconPicker.module.css';

type Props = {
  name: string;
  path: string;
  isSelected: boolean;
  onSelect: (name: string) => void;
};

export const IconCell = memo(function IconCell({ name, path, isSelected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      data-selected={isSelected ? 'true' : undefined}
      onClick={() => onSelect(name)}
      title={name}
    >
      <Icon path={path} />
      <span className={styles.iconLabel}>{name}</span>
    </button>
  );
});
