import { LucideIcon } from 'lucide-react';

export type UserRole = 'employee' | 'supervisor' | 'hr';

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badge?: number;
  exactMatch?: boolean;
  children?: NavigationItem[];
}

export interface NavigationConfig {
  items: NavigationItem[];
  filterByRole: (role: UserRole) => NavigationItem[];
}

