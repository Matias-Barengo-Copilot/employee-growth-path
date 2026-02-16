import { UserRole } from '@/lib/types/navigation';

/**
 * Define permisos para cada rol
 */
export const rolePermissions = {
  employee: [
    'submit_leave_request',
    'view_own_requests',
    'withdraw_own_requests',
  ],
  supervisor: [
    'submit_leave_request',
    'view_own_requests',
    'withdraw_own_requests',
    'view_project_requests',
    'approve_project_requests',
    'reverse_project_approval',
  ],
  hr: [
    'submit_leave_request',
    'view_own_requests',
    'withdraw_own_requests',
    'view_all_requests',
    'approve_all_requests',
    'reverse_all_approval',
    'create_employees',
    'edit_employees',
    'view_all_employees',
  ],
} as const;

export type Permission = 
  | 'submit_leave_request'
  | 'view_own_requests'
  | 'withdraw_own_requests'
  | 'view_project_requests'
  | 'approve_project_requests'
  | 'reverse_project_approval'
  | 'view_company_requests'
  | 'approve_company_requests'
  | 'reverse_company_approval'
  | 'view_all_requests'
  | 'approve_all_requests'
  | 'reverse_all_approval'
  | 'create_employees'
  | 'edit_employees'
  | 'view_all_employees';

/**
 * Verifica si un usuario tiene un permiso específico
 * 
 * @param role - Rol del usuario
 * @param permission - Permiso a verificar
 * @returns true si el usuario tiene el permiso, false en caso contrario
 * 
 * @example
 * ```ts
 * hasPermission('hr', 'create_employees') // Returns: true
 * hasPermission('employee', 'create_employees') // Returns: false
 * ```
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  return (permissions as readonly Permission[]).includes(permission);
}

/**
 * Verifica si un usuario puede acceder a una ruta específica
 * 
 * @param role - Rol del usuario
 * @param route - Ruta a verificar
 * @returns true si el usuario puede acceder, false en caso contrario
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  // Rutas públicas
  const publicRoutes = ['/sign-in', '/sign-up', '/onboarding'];
  if (publicRoutes.some(r => route.startsWith(r))) {
    return true;
  }

  // Rutas específicas por rol
  const routePermissions: Record<string, Permission[]> = {
    '/employees/create': ['create_employees'],
    '/employees': ['view_all_employees'],
  };

  for (const [routePattern, requiredPermissions] of Object.entries(routePermissions)) {
    if (route.startsWith(routePattern)) {
      return requiredPermissions.some(perm => hasPermission(role, perm));
    }
  }

  // Por defecto, permitir acceso (las rutas específicas están protegidas por middleware)
  return true;
}

