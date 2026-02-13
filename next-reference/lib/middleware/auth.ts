import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db/client";
import { employees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { detectAndSetInitialAdmin } from "../services/admin.service";

export interface AuthenticatedUser {
  employeeId: string;
  role: "employee" | "supervisor" | "hr";
  companyId: string;
  email: string;
  name: string;
}

/**
 * Obtiene el usuario autenticado desde la sesión de NextAuth
 *
 * @returns Datos del empleado autenticado
 * @throws UnauthorizedError si no está autenticado o no existe en DB
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const session = await getSession();

  if (!session?.user?.email) {
    throw new UnauthorizedError("Authentication required");
  }

  // Buscar empleado activo por email en la DB
  let [employee] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
    .limit(1);

  // If employee doesn't exist, check if this is the first user (initial admin)
  if (!employee) {
    const isInitialAdmin = await detectAndSetInitialAdmin(
      session.user.email,
      session.user.name || session.user.email.split('@')[0]
    );

    if (isInitialAdmin) {
      // Reintentar obtener el empleado activo después de crear admin
      [employee] = await db
        .select()
        .from(employees)
        .where(and(eq(employees.email, session.user.email), eq(employees.isActive, true)))
        .limit(1);
    }

    if (!employee) {
      throw new UnauthorizedError("Employee record not found. Please contact your administrator.");
    }
  }

  return {
    employeeId: employee.id,
    role: employee.role as AuthenticatedUser["role"],
    companyId: employee.companyId,
    email: employee.email,
    name: employee.name,
  };
}

export function requireRole(
  user: AuthenticatedUser,
  allowedRoles: AuthenticatedUser["role"][]
) {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied. Required roles: ${allowedRoles.join(", ")}`
    );
  }
}

