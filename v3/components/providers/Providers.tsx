'use client';

import type { ReactNode } from 'react';

import { ToastProvider } from '../toast/ToastProvider';
import { AuthProvider } from './AuthProvider';
import { QueryProvider } from './QueryProvider';

type Props = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export const Providers = ({ isAuthenticated, children }: Props) => {
  return (
    <QueryProvider>
      <AuthProvider isAuthenticated={isAuthenticated}>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
};
