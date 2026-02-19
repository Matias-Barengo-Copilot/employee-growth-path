'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItemProps {
  /** Display label for the navigation item */
  label: string;
  /** Route path for the navigation item */
  href: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Whether this item represents the current active route */
  isActive: boolean;
  /** Whether the sidebar is collapsed (shows only icon) */
  isCollapsed: boolean;
  /** Optional badge count for notifications */
  badge?: number;
}

/**
 * Individual navigation item component
 * Handles active state, collapsed state, and badges
 * 
 * @example
 * ```tsx
 * <NavItem
 *   label="My Requests"
 *   href="/requests/my-requests"
 *   icon={List}
 *   isActive={pathname.startsWith('/requests/my-requests')}
 *   isCollapsed={false}
 * />
 * ```
 */
export function NavItem({
  label,
  href,
  icon: Icon,
  isActive,
  isCollapsed,
  badge,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
        'transition-colors duration-200',
        'hover:bg-accent/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        isActive
          ? 'bg-accent/10 text-accent font-semibold'
          : 'text-slate-600 hover:text-accent'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={isCollapsed ? label : undefined}
    >
      <Icon className={cn('h-5 w-5 shrink-0', isCollapsed && 'mx-auto')} />
      {!isCollapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}

