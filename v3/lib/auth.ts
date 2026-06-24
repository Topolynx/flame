import { cookies } from 'next/headers';
import { cache } from 'react';

import { verifySession } from './jwt';

export const SESSION_COOKIE = 'flame_session';

export type User = {
  id: number;
  role: 'admin';
};

export const ADMIN_USER: User = { id: 1, role: 'admin' };

export const isAuthDisabled = (): boolean => process.env.AUTH_DISABLED === 'true';

const readCurrentUser = async (): Promise<User | null> => {
  if (isAuthDisabled()) {
    return ADMIN_USER;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySession(token);

  if (!payload) {
    return null;
  }

  return ADMIN_USER;
};

export const getCurrentUser = cache(readCurrentUser);

export const isAuthenticated = async (): Promise<boolean> => {
  return (await getCurrentUser()) !== null;
};
