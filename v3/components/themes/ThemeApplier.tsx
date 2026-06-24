'use client';
import { useEffect } from 'react';

import type { ResolvedTheme } from '@/lib/themes';

export const ThemeApplier = ({ theme }: { theme: ResolvedTheme }) => {
  const {
    name,
    colors: { background, primary, accent },
  } = theme;

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = name;
    root.style.setProperty('--color-background', background);
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-accent', accent);
  }, [name, background, primary, accent]);

  return null;
};
