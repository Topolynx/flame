import type { ComponentPropsWithoutRef } from 'react';

type Props = Omit<ComponentPropsWithoutRef<'svg'>, 'viewBox' | 'children'> & {
  path: string;
};

export const Icon = ({ path, ...rest }: Props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...rest}>
    <path d={path} />
  </svg>
);
