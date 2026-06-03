'use client';

import type { Theme } from '@/lib/themes';
import { ThemePreview } from './ThemePreview';
import styles from './ThemeGrid.module.css';

type Props = {
  themes: Theme[];
  activeThemeName: string;
  onSelect: (theme: Theme) => void;
};

export const ThemeGrid = ({ themes, activeThemeName, onSelect }: Props) => {
  return (
    <div className={styles.themeGrid}>
      {themes.map(theme => (
        <ThemePreview
          key={theme.name}
          theme={theme}
          isActive={theme.name === activeThemeName}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
