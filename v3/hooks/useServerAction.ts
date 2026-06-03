'use client';

import { useState } from 'react';

import { useToast } from '@/components/toast/ToastProvider';

type ServerActionResult = { success: boolean; message: string };

type RunOptions<R extends ServerActionResult> = {
  onSuccess?: (result: R) => void;
  silentOnSuccess?: boolean;
};

export const useServerAction = () => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runServerAction = async <R extends ServerActionResult>(
    action: () => Promise<R>,
    options?: RunOptions<R>,
  ): Promise<R | null> => {
    setIsSubmitting(true);

    try {
      const result = await action();

      if (result.success) {
        if (!options?.silentOnSuccess) {
          toast.success(result.message);
        }

        options?.onSuccess?.(result);
      } else {
        toast.error(result.message);
      }

      return result;
    } catch {
      toast.error('Something went wrong');

      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, runServerAction };
};
