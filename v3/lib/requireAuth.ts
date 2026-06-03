import { isAuthenticated } from './auth';

type ServerActionResult = { success: boolean; message: string };

const NOT_AUTHENTICATED = { success: false, message: 'Not authenticated' } as const;

export const requireAuth =
  <Args extends unknown[], R extends ServerActionResult>(action: (...args: Args) => Promise<R>) =>
  async (...args: Args): Promise<R> => {
    if (!(await isAuthenticated())) {
      return NOT_AUTHENTICATED as unknown as R;
    }

    return action(...args);
  };
