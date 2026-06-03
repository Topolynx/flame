'use client';

import { useState, type SyntheticEvent } from 'react';

import { TextField } from '@/components/settings/TextField';
import { Button } from '@/components/ui/Button';
import type { Theme, ThemeColors } from '@/lib/themes';
import styles from './ThemeForm.module.css';

export type ThemeFormSubmit = Omit<Theme, 'isCustom'>;

type Props = {
  initialTheme?: Theme;
  isSubmitting?: boolean;
  onSubmit: (theme: ThemeFormSubmit) => Promise<void> | void;
};

const buildInitialState = (initialTheme?: Theme): ThemeFormSubmit => ({
  name: initialTheme?.name ?? '',
  colors: initialTheme?.colors ?? {
    primary: '#ffffff',
    accent: '#ffffff',
    background: '#ffffff',
  },
});

export const ThemeForm = ({ initialTheme, isSubmitting, onSubmit }: Props) => {
  const [formState, setFormState] = useState<ThemeFormSubmit>(() =>
    buildInitialState(initialTheme),
  );

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      name: formState.name.trim(),
      colors: formState.colors,
    });
  };

  const updateColor = (colorLayer: keyof ThemeColors) => (value: string) => {
    setFormState(state => ({ ...state, colors: { ...state.colors, [colorLayer]: value } }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        id="themeName"
        label="Theme name"
        placeholder="my_theme"
        required
        value={formState.name}
        onChange={value => setFormState(state => ({ ...state, name: value }))}
        disabled={isSubmitting}
      />

      <div className={styles.colorsContainer}>
        <TextField
          id="themePrimary"
          label="Primary color"
          type="color"
          required
          value={formState.colors.primary}
          onChange={updateColor('primary')}
          disabled={isSubmitting}
        />

        <TextField
          id="themeAccent"
          label="Accent color"
          type="color"
          required
          value={formState.colors.accent}
          onChange={updateColor('accent')}
          disabled={isSubmitting}
        />

        <TextField
          id="themeBackground"
          label="Background color"
          type="color"
          required
          value={formState.colors.background}
          onChange={updateColor('background')}
          disabled={isSubmitting}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {initialTheme ? 'Update theme' : 'Add theme'}
      </Button>
    </form>
  );
};
