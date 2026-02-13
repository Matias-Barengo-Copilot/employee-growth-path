import {
  FileText,
  List,
  CheckCircle,
  UserPlus,
  Settings,
  TestTube,
  BarChart3,
} from 'lucide-react';
import { NavigationItem, UserRole } from '@/lib/types/navigation';
import { isTestModeEnabled } from '@/lib/utils/test-mode';

const baseNavigationItems: NavigationItem[] = [
  {
    label: "Submit Leave Request",
    href: "/leave-requests/submit",
    icon: FileText,
    roles: ["employee", "supervisor"],
    exactMatch: false,
  },
  {
    label: "My Requests",
    href: "/requests/my-requests",
    icon: List,
    roles: ["employee", "supervisor"],
    exactMatch: false,
  },
  {
    label: "Leave Approvals",
    href: "/requests/approvals",
    icon: CheckCircle,
    roles: ["supervisor", "hr"],
    exactMatch: false,
  },
  {
    label: "Leaves total",
    href: "/leaves-total",
    icon: BarChart3,
    roles: ["hr"],
    exactMatch: false,
  },
  {
    label: "Members",
    href: "/employees",
    icon: UserPlus,
    roles: ["hr"],
    exactMatch: false,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["hr"],
    exactMatch: false,
  },
];

function getNavigationItems(): NavigationItem[] {
  return isTestModeEnabled() ? [...baseNavigationItems, { label: 'Test Users', href: '/test-users', icon: TestTube, roles: ['hr'] as UserRole[], exactMatch: false }] : baseNavigationItems;
}

/**
 * Complete navigation configuration (for backward compatibility)
 * @deprecated Use getNavigationItems() instead for runtime evaluation
 */
export const navigationItems: NavigationItem[] = baseNavigationItems;

/**
 * "All Leave Requests" tab for users who can view all company requests (e.g. company lead)
 * Same page as HR's "Leave Approvals" but shown as separate tab for employees with this permission
 */
const ALL_REQUESTS_NAV_ITEM: NavigationItem = {
  label: 'All Leave Requests',
  href: '/requests/all-requests',
  icon: CheckCircle,
  roles: [], // not role-based; shown when canViewAllLeaveRequests is true
  exactMatch: false,
};

export function getNavigationItemsByRole(
  role: UserRole,
  options?: { canViewAllLeaveRequests?: boolean }
): NavigationItem[] {
  const canViewAll = options?.canViewAllLeaveRequests ?? false;
  const seenKeys = new Set<string>();
  let items = getNavigationItems().filter((item) => item.roles.includes(role));

  // Users with "view all" (e.g. Manan, Matias) always get the "All Leave Requests" and "Leaves total" tabs
  if (canViewAll) {
    items = [...items, ALL_REQUESTS_NAV_ITEM];
    if (!items.some((item) => item.href === '/leaves-total')) {
      items = [...items, { label: 'Leaves total', href: '/leaves-total', icon: BarChart3, roles: [] as UserRole[], exactMatch: false }];
    }
  }

  // Dedupe by href+label so "Leave Approvals" and "All Leave Requests" (same href) both show for supervisors
  return items.filter((item) => {
    const key = `${item.href}:${item.label}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

