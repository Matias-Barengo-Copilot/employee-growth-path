'use client';

import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMenuButtonProps {
  /** Whether the mobile menu is currently open */
  isOpen: boolean;
  /** Callback function to toggle the mobile menu */
  onToggle: () => void;
}

/**
 * Mobile hamburger menu button
 * Only visible on mobile devices (< 768px)
 * Toggles the sidebar drawer open/closed
 * 
 * @example
 * ```tsx
 * <MobileMenuButton isOpen={isMobileOpen} onToggle={toggleMobile} />
 * ```
 */
export function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'fixed left-4 top-4 z-50 md:hidden',
        'h-10 w-10 rounded-lg'
      )}
      onClick={onToggle}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <Menu className="h-6 w-6" />
      )}
    </Button>
  );
}

