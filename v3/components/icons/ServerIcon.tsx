import type { ComponentPropsWithoutRef } from 'react';

import { getIconSvg } from '@/lib/icons';

type Props = Omit<ComponentPropsWithoutRef<'svg'>, 'viewBox' | 'children'> & { name: string };

export const ServerIcon = ({ name, ...rest }: Props) => {
  const svg = getIconSvg(name);

  if (!svg) {
    return null;
  }

  return (
    <svg viewBox={svg.viewBox} aria-hidden="true" fill="currentColor" {...rest}>
      <path d={svg.path} />
    </svg>
  );
};
