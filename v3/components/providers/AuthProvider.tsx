'use client';

import { createContext, useContext, type ReactNode } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Props = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export const AuthProvider = ({ isAuthenticated, children }: Props) => {
  return <AuthContext.Provider value={{ isAuthenticated }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return ctx;
};
