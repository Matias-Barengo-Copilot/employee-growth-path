'use client';

import { UserRole } from '@/lib/types/navigation';
import { hasPermission, Permission } from '@/lib/utils/permissions';

interface RequireRoleProps {
  role: UserRole;
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that renders children only if user has required permission
 * 
 * @example
 * ```tsx
 * <RequireRole role="hr" permission="create_employees">
 *   <CreateEmployeeButton />
 * </RequireRole>
 * ```
 */
export function RequireRole({ 
  role, 
  permission, 
  children, 
  fallback = null 
}: RequireRoleProps) {
  if (hasPermission(role, permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

