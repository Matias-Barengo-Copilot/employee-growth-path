import { db } from '@/db/client';
import { employees, organizations, companies } from '@/db/schema';
import { CreateEmployeeInput } from '@/lib/types';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

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
 * Crea empleado en base de datos
 * El usuario podrá hacer sign-in con Google usando el email proporcionado
 * 
 * @param data - Datos del empleado
 * @returns ID del empleado creado
 */
export async function createEmployeeInDatabase(
  data: CreateEmployeeInput
): Promise<string> {
  try {
    // Verificar que el email no existe
    const [existing] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, data.email))
      .limit(1);

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Obtener o crear compañía por defecto si no se proporciona
    const companyId = data.companyId || await getOrCreateDefaultCompany();

    const [employee] = await db
      .insert(employees)
      .values({
        email: data.email,
        name: data.name,
        companyId,
        country: data.country,
        role: data.role,
        roleType: data.roleType || 'employee',
        joiningDate: data.joiningDate || null,
        birthday: data.birthday || null,
        usedVacationDays: 0, // Initialize used days to 0 (no days used yet)
        lastVacationResetDate: null, // Will be set on first reset
        isInitialAdmin: false,
        // googleId will be updated when user signs in for the first time
      })
      .returning();

    return employee.id;
  } catch (error) {
    logger.error('Error creating employee in database:', error);
    throw new Error(`Failed to create employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Crea un usuario completo en la base de datos
 * 
 * @param data - Datos del empleado a crear
 * @returns ID del empleado creado
 */
export async function createUserComplete(
  data: CreateEmployeeInput
): Promise<{ employeeId: string }> {
  const employeeId = await createEmployeeInDatabase(data);

  return {
    employeeId,
  };
}

