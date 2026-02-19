'use client';

import { useCallback } from 'react';
import { useToastContext } from '@/lib/contexts/toast-context';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Type-safe hook for showing toast notifications
 * Uses React Context API instead of global window object
 * 
 * @returns Object with toast methods
 */
export function useToast() {
  const { showToast: showToastFromContext } = useToastContext();

  const showToast = useCallback((options: ToastOptions) => {
    showToastFromContext(options);
  }, [showToastFromContext]);

  const success = useCallback((title: string, description?: string) => {
    showToast({ title, description, variant: 'default' });
  }, [showToast]);

  const error = useCallback((title: string, description?: string) => {
    showToast({ title, description, variant: 'destructive' });
  }, [showToast]);

  return {
    showToast,
    success,
    error,
  };
}
