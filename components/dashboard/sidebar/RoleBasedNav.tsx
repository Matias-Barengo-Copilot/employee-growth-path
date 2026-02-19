import { UserRole } from '@/lib/types/navigation';
import { getNavigationItemsByRole } from '@/lib/constants/navigation';
import type { NavigationItem } from '@/lib/types/navigation';

interface RoleBasedNavProps {
  /** User role to filter navigation items by */
  userRole: UserRole;
}

/**
 * Server Component that generates navigation items based on user role
 * Filters navigation items to show only those accessible to the specified role
 * 
 * @param userRole - The role of the current user
 * @returns Array of navigation items filtered by role
 * 
 * @example
 * ```tsx
 * const navItems = RoleBasedNav({ userRole: 'employee' });
 * // Returns: Submit Leave Request, My Requests
 * ```
 */
export function RoleBasedNav({ userRole }: RoleBasedNavProps): NavigationItem[] {
  return getNavigationItemsByRole(userRole);
}

