'use client';

import type { Theme } from '@/lib/themes';
import styles from './ThemePreview.module.css';

type Props = {
  theme: Theme;
  isActive: boolean;
  onSelect: (theme: Theme) => void;
};

export const ThemePreview = ({ theme, isActive, onSelect }: Props) => {
  const className = isActive ? `${styles.themePreview} ${styles.active}` : styles.themePreview;
  const {
    name,
    colors: { background, primary, accent },
  } = theme;

  return (
    <button type="button" className={className} onClick={() => onSelect(theme)}>
      <div className={styles.colorsPreviewContainer}>
        <div className={styles.colorPreviewCell} style={{ backgroundColor: background }} />
        <div className={styles.colorPreviewCell} style={{ backgroundColor: primary }} />
        <div className={styles.colorPreviewCell} style={{ backgroundColor: accent }} />
      </div>
      <p>{name}</p>
    </button>
  );
};
