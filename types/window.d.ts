// Note: window.showToast has been deprecated in favor of useToast hook with Context API
// This type definition is kept for backward compatibility but should not be used in new code
// Use useToast hook from '@/lib/hooks/useToast' instead

import { ToastProps } from '@/components/ui/toast';

declare global {
  interface Window {
    /** @deprecated Use useToast hook instead. This will be removed in a future version. */
    showToast?: (toast: Omit<ToastProps, 'id'>) => void;
  }
}

export {};

