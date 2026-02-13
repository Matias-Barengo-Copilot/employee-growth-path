import { LucideIcon } from 'lucide-react';

/**
 * User role type for navigation and access control
 * Matches the EmployeeRole type from the database schema
 */
export type UserRole = 'employee' | 'supervisor' | 'hr';

/**
 * Navigation item configuration
 * Defines a single navigation item with its properties
 */
export interface NavigationItem {
  /** Display label for the navigation item */
  label: string;
  /** Route path for the navigation item */
  href: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Array of user roles that can see this navigation item */
  roles: UserRole[];
  /** Optional badge count for notifications (future feature) */
  badge?: number;
  /** Whether to match the route exactly (default: false, uses startsWith) */
  exactMatch?: boolean;
}

/**
 * Navigation configuration interface
 * Contains all navigation items and filtering logic
 */
export interface NavigationConfig {
  /** Array of all navigation items */
  items: NavigationItem[];
  /** Function to filter navigation items by user role */
  filterByRole: (role: UserRole) => NavigationItem[];
}

