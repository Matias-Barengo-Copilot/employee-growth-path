import {
  FileText,
  List,
  CheckCircle,
  Users,
  BarChart3,
  LayoutDashboard,
  Target,
  Zap,
  MessageSquare,
  TrendingUp,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { NavigationItem, UserRole } from "@/lib/types/navigation";

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const baseNavigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: true,
  },
  {
    label: "Directory",
    href: "/employees",
    icon: Users,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
  },
  {
    label: "Snaps",
    href: "/snaps",
    icon: Zap,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
  },
  {
    label: "Feedback",
    href: "/feedback",
    icon: MessageSquare,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
  },
  {
    label: "Time Off",
    href: "/leave-requests",
    icon: Calendar,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
    children: [
      {
        label: "Submit Request",
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
        label: "Approvals",
        href: "/requests/approvals",
        icon: CheckCircle,
        roles: ["supervisor", "hr"],
        exactMatch: false,
      },
      {
        label: "Leaves Total",
        href: "/leaves-total",
        icon: BarChart3,
        roles: ["hr"],
        exactMatch: false,
      },
    ],
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
  },
  {
    label: "Career",
    href: "/career",
    icon: TrendingUp,
    roles: ["employee", "supervisor", "hr"],
    exactMatch: false,
  },
];

export const navigationItems: NavigationItem[] = baseNavigationItems;

const ALL_REQUESTS_NAV_ITEM: NavigationItem = {
  label: "All Requests",
  href: "/requests/all-requests",
  icon: CheckCircle,
  roles: [],
  exactMatch: false,
};

export function getNavigationItemsByRole(
  role: UserRole,
  options?: { canViewAllLeaveRequests?: boolean },
): NavigationItem[] {
  const canViewAll = options?.canViewAllLeaveRequests ?? false;
  const seenKeys = new Set<string>();

  const items = baseNavigationItems.reduce<NavigationItem[]>((acc, item) => {
    if (!item.roles.includes(role)) return acc;

    if (item.children) {
      const filteredChildren = item.children.filter((child) =>
        child.roles.includes(role),
      );

      if (canViewAll) {
        if (
          !filteredChildren.some((c) => c.href === ALL_REQUESTS_NAV_ITEM.href)
        ) {
          filteredChildren.push(ALL_REQUESTS_NAV_ITEM);
        }
        if (!filteredChildren.some((c) => c.href === "/leaves-total")) {
          filteredChildren.push({
            label: "Leaves Total",
            href: "/leaves-total",
            icon: BarChart3,
            roles: [] as UserRole[],
            exactMatch: false,
          });
        }
      }

      if (filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren });
      }
    } else {
      acc.push(item);
    }

    return acc;
  }, []);

  return items.filter((item) => {
    const key = `${item.href}:${item.label}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}
