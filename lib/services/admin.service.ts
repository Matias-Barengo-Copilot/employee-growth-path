import { db } from '@/db/client';
import { employees, organizations, companies } from '@/db/schema';
import { count, eq } from 'drizzle-orm';

/**
 * Crea una organización y compañía por defecto si no existen
 * Retorna el ID de la compañía por defecto
 */
async function getOrCreateDefaultCompany(): Promise<string> {
  // Buscar si ya existe una organización por defecto
  const [org] = await db
    .select()
    .from(organizations)
    .limit(1);

  if (org) {
    // Buscar compañía de la organización
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.organizationId, org.id))
      .limit(1);

    if (company) {
      return company.id;
    }

    // Crear compañía si no existe
    const [newCompany] = await db
      .insert(companies)
      .values({
        organizationId: org.id,
        name: 'Default Company',
      })
      .returning();

    return newCompany.id;
  }

  // Crear organización y compañía por defecto
  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: 'Default Organization',
    })
    .returning();

  const [newCompany] = await db
    .insert(companies)
    .values({
      organizationId: newOrg.id,
      name: 'Default Company',
    })
    .returning();

  return newCompany.id;
}

/**
 * Detecta si un usuario es el primero en registrarse
 * Si es el primero, lo marca como HR (admin) y lo crea en la base de datos
 * 
 * @param email - Email del usuario (de Google OAuth)
 * @param name - Nombre del usuario (de Google OAuth)
 * @returns true si el usuario fue creado como admin inicial, false en caso contrario
 */
export async function detectAndSetInitialAdmin(email: string, name: string): Promise<boolean> {
  try {
    // Contar total de empleados
    const [result] = await db
      .select({ count: count() })
      .from(employees);

    // If this is the first user, create as HR (admin)
    if (result.count === 0) {
      // Create default organization and company
      const companyId = await getOrCreateDefaultCompany();

      // Create employee with HR role
      // Initialize vacation days to 0 by default (HR can update later)
      await db.insert(employees).values({
        email: email,
        name: name || email.split('@')[0],
        companyId: companyId,
        country: 'Unknown', // User can update later
        role: 'hr',
        usedVacationDays: 0, // Initialize used days to 0 (no days used yet)
        lastVacationResetDate: null, // Will be set on first reset
        isInitialAdmin: true,
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error detecting initial admin:', error);
    throw error;
  }
}

/**
 * Verifica si un usuario es el admin inicial
 * 
 * @param employeeId - ID del empleado en la base de datos
 * @returns true si es admin inicial, false en caso contrario
 */
export async function isInitialAdmin(employeeId: string): Promise<boolean> {
  try {
    const [employee] = await db
      .select({ isInitialAdmin: employees.isInitialAdmin })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    return employee?.isInitialAdmin === true;
  } catch (error) {
    console.error('Error checking initial admin:', error);
    return false;
  }
}

