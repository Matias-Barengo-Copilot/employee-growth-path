import { db } from "@/db/client";
import { employees, companies } from "@/db/schema";
import { eq, and, inArray, asc, count, or, ilike, ne } from "drizzle-orm";
import { CreateEmployeeInput, UpdateEmployeeInput, EmployeeRole } from "@/lib/types";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/utils/errors";

export class EmployeeRepository {
  async create(data: CreateEmployeeInput) {
    // Check if employee with same email already exists (including inactive)
    const existing = await db
      .select()
      .from(employees)
      .where(eq(employees.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError("Employee with this email already exists");
    }

    if (!data.companyId) {
      throw new Error('Company ID is required');
    }

    const [employee] = await db
      .insert(employees)
      .values({
        email: data.email,
        name: data.name,
        companyId: data.companyId,
        country: data.country,
        role: data.role,
        roleType: data.roleType || 'employee',
        joiningDate: data.joiningDate || null,
        birthday: data.birthday || null,
        usedVacationDays: 0, // Initialize used days to 0 (no days used yet)
        lastVacationResetDate: null, // Will be set on first reset
        isActive: true, // New employees are always active
      })
      .returning();

    return employee;
  }

  async findById(id: string, includeInactive: boolean = false) {
    const conditions = [eq(employees.id, id)];
    if (!includeInactive) {
      conditions.push(eq(employees.isActive, true));
    }

    const [employee] = await db
      .select({
        id: employees.id,
        companyId: employees.companyId,
        name: employees.name,
        email: employees.email,
        country: employees.country,
        role: employees.role,
        roleType: employees.roleType,
        joiningDate: employees.joiningDate,
        birthday: employees.birthday,
        title: employees.title,
        department: employees.department,
        location: employees.location,
        timezone: employees.timezone,
        slackHandle: employees.slackHandle,
        whatIDo: employees.whatIDo,
        workingPreferences: employees.workingPreferences,
        currentlyWorkingOn: employees.currentlyWorkingOn,
        strengths: employees.strengths,
        funFacts: employees.funFacts,
        profileImageUrl: employees.profileImageUrl,
        usedVacationDays: employees.usedVacationDays,
        lastVacationResetDate: employees.lastVacationResetDate,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          organizationId: companies.organizationId,
        },
      })
      .from(employees)
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(and(...conditions))
      .limit(1);

    return employee || null;
  }

  async findByEmail(email: string, includeInactive: boolean = false) {
    const conditions = [eq(employees.email, email)];
    if (!includeInactive) {
      conditions.push(eq(employees.isActive, true));
    }

    const [employee] = await db
      .select()
      .from(employees)
      .where(and(...conditions))
      .limit(1);

    return employee || null;
  }

  async findByCompanyId(companyId: string) {
    return db
      .select({
        id: employees.id,
        companyId: employees.companyId,
        name: employees.name,
        email: employees.email,
        country: employees.country,
        location: employees.location,
        title: employees.title,
        department: employees.department,
        role: employees.role,
        roleType: employees.roleType,
        joiningDate: employees.joiningDate,
        birthday: employees.birthday,
        usedVacationDays: employees.usedVacationDays,
        lastVacationResetDate: employees.lastVacationResetDate,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .where(and(eq(employees.companyId, companyId), eq(employees.isActive, true)));
  }

  async findByOrganizationId(organizationId: string) {
    return db
      .select({
        id: employees.id,
        companyId: employees.companyId,
        name: employees.name,
        email: employees.email,
        country: employees.country,
        location: employees.location,
        title: employees.title,
        department: employees.department,
        role: employees.role,
        roleType: employees.roleType,
        joiningDate: employees.joiningDate,
        birthday: employees.birthday,
        usedVacationDays: employees.usedVacationDays,
        lastVacationResetDate: employees.lastVacationResetDate,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
        },
      })
      .from(employees)
      .leftJoin(companies, eq(employees.companyId, companies.id))
      .where(and(eq(companies.organizationId, organizationId), eq(employees.isActive, true)));
  }

  /**
   * Get employees eligible to be PM or Tech Lead (roles: supervisor, hr)
   * Excludes employees with role "employee" as they are not eligible for project leadership roles
   * Can optionally exclude a specific employee (e.g., the current user creating the request)
   * When allRoles is true, returns all active employees regardless of role
   * Ordered by name for easy selection
   */
  async findEligibleForProjectRoles(companyId?: string, excludeEmployeeId?: string, allRoles?: boolean) {
    const conditions = [
      eq(employees.isActive, true),
    ];

    if (!allRoles) {
      const eligibleRoles: Array<"supervisor" | "hr"> = ["supervisor", "hr"];
      conditions.push(inArray(employees.role, eligibleRoles));
    }
    
    if (companyId) {
      conditions.push(eq(employees.companyId, companyId));
    }
    
    // Exclude the specified employee (e.g., the user creating the request)
    if (excludeEmployeeId) {
      conditions.push(ne(employees.id, excludeEmployeeId));
    }

    return db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.role,
      })
      .from(employees)
      .where(and(...conditions))
      .orderBy(asc(employees.name));
  }

  /**
   * Count employees with optional filters
   * @param filters - Optional filters for companyId, roles, and search
   * @returns Total count of employees matching the filters
   */
  async countByFilters(filters?: { companyId?: string; roles?: string[]; search?: string }): Promise<number> {
    const conditions = [eq(employees.isActive, true)]; // Only count active employees

    if (filters?.companyId) {
      conditions.push(eq(employees.companyId, filters.companyId));
    }

    if (filters?.roles && filters.roles.length > 0) {
      const validRoles: EmployeeRole[] = ["employee", "supervisor", "hr"];
      const filteredRoles = filters.roles.filter((r): r is EmployeeRole => 
        validRoles.includes(r as EmployeeRole)
      );
      
      if (filteredRoles.length > 0) {
        conditions.push(inArray(employees.role, filteredRoles));
      }
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(employees.name, searchTerm),
          ilike(employees.email, searchTerm)
        )!
      );
    }

    const [result] = await db
      .select({ count: count() })
      .from(employees)
      .where(and(...conditions));

    return result.count;
  }

  /**
   * Find employees with optional filters and pagination
   * Filters are applied at the database level for better performance
   * @param filters - Optional filters for companyId, roles, and search
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, 0 = no limit)
   * @returns List of employees matching the filters
   */
  async findByFilters(
    filters?: { companyId?: string; roles?: string[]; search?: string },
    page: number = 1,
    limit: number = 10
  ) {
    const conditions = [eq(employees.isActive, true)]; // Only show active employees

    if (filters?.companyId) {
      conditions.push(eq(employees.companyId, filters.companyId));
    }

    if (filters?.roles && filters.roles.length > 0) {
      // Validate roles are valid employee roles
      const validRoles: EmployeeRole[] = ["employee", "supervisor", "hr"];
      const filteredRoles = filters.roles.filter((r): r is EmployeeRole => 
        validRoles.includes(r as EmployeeRole)
      );
      
      if (filteredRoles.length > 0) {
        conditions.push(inArray(employees.role, filteredRoles));
      }
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(employees.name, searchTerm),
          ilike(employees.email, searchTerm)
        )!
      );
    }

    const offset = (page - 1) * limit;

    const queryBuilder = db
      .select({
        id: employees.id,
        companyId: employees.companyId,
        name: employees.name,
        email: employees.email,
        country: employees.country,
        location: employees.location,
        title: employees.title,
        department: employees.department,
        role: employees.role,
        roleType: employees.roleType,
        joiningDate: employees.joiningDate,
        birthday: employees.birthday,
        usedVacationDays: employees.usedVacationDays,
        lastVacationResetDate: employees.lastVacationResetDate,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .where(and(...conditions))
      .orderBy(asc(employees.name))
      .limit(limit > 0 ? limit : 1000)
      .offset(offset);

    return await queryBuilder;
  }

  async update(id: string, data: UpdateEmployeeInput) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError("Employee not found");
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existing.email) {
      const emailExists = await this.findByEmail(data.email);
      if (emailExists) {
        throw new ConflictError("Employee with this email already exists");
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.roleType !== undefined) updateData.roleType = data.roleType;
    if (data.joiningDate !== undefined) updateData.joiningDate = data.joiningDate || null;
    if (data.birthday !== undefined) updateData.birthday = data.birthday || null;
    if (data.title !== undefined) updateData.title = data.title || null;
    if (data.department !== undefined) updateData.department = data.department || null;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.timezone !== undefined) updateData.timezone = data.timezone || null;
    if (data.slackHandle !== undefined) updateData.slackHandle = data.slackHandle || null;
    if (data.whatIDo !== undefined) updateData.whatIDo = data.whatIDo || null;
    if (data.workingPreferences !== undefined) updateData.workingPreferences = data.workingPreferences || null;
    if (data.currentlyWorkingOn !== undefined) updateData.currentlyWorkingOn = data.currentlyWorkingOn || null;
    if (data.strengths !== undefined) updateData.strengths = data.strengths || null;
    if (data.funFacts !== undefined) updateData.funFacts = data.funFacts || null;
    if (data.profileImageUrl !== undefined) updateData.profileImageUrl = data.profileImageUrl || null;
    

    const [updated] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();

    return updated;
  }

  /**
   * Add used vacation days to an employee's used days count
   * Called when a leave request is approved
   */
  async addUsedVacationDays(employeeId: string, days: number): Promise<void> {
    const employee = await this.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const currentUsed = employee.usedVacationDays || 0;
    // Simply add the days - no limit check needed
    const newUsed = currentUsed + days;

    await db
      .update(employees)
      .set({
        usedVacationDays: newUsed,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));
  }

  /**
   * Subtract used vacation days from an employee's used days count
   * Useful when a vacation request is cancelled or rejected (revert the used days)
   */
  async subtractUsedVacationDays(employeeId: string, days: number): Promise<void> {
    const employee = await this.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    const currentUsed = employee.usedVacationDays || 0;
    // Don't allow used days to go below 0
    const newUsed = Math.max(0, currentUsed - days);

    await db
      .update(employees)
      .set({
        usedVacationDays: newUsed,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));
  }

  /**
   * Reset vacation days for employees who need it (new year)
   * Resets usedVacationDays to 0 and updates lastVacationResetDate
   * Note: This method should be called with employee IDs from findEmployeesNeedingReset()
   * for proper year comparison, as SQL date comparison can be complex
   */
  async resetVacationDaysForNewYear(employeeIds: string[]): Promise<number> {
    if (employeeIds.length === 0) {
      return 0;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const resetDate = new Date(currentYear, 0, 1); // January 1st of current year

    const result = await db
      .update(employees)
      .set({
        usedVacationDays: 0, // Reset used days to 0 for new year
        lastVacationResetDate: resetDate.toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(inArray(employees.id, employeeIds))
      .returning({ id: employees.id });

    return result.length;
  }

  /**
   * Get employees that need vacation days reset (last reset before current year or null)
   */
  async findEmployeesNeedingReset(): Promise<Array<{ id: string; lastVacationResetDate: Date | null }>> {
    const allEmployees = await db
      .select({
        id: employees.id,
        lastVacationResetDate: employees.lastVacationResetDate,
      })
      .from(employees)
      .where(eq(employees.isActive, true)); // Only reset vacation days for active employees

    const currentYear = new Date().getFullYear();
    
    return allEmployees.map(emp => {
      let resetDate: Date | null = null;
      const resetValue = emp.lastVacationResetDate;
      if (resetValue) {
        // Drizzle returns date fields as Date objects or strings depending on the column type
        // Convert to Date safely
        try {
          // Try to use as Date if it's already a Date object
          if (resetValue && typeof resetValue === 'object' && 'getTime' in resetValue) {
            resetDate = resetValue as unknown as Date;
          } else {
            // Otherwise, treat it as a string and convert
            resetDate = new Date(String(resetValue));
          }
        } catch {
          resetDate = null;
        }
      }
      return {
        id: emp.id,
        lastVacationResetDate: resetDate
      };
    }).filter(emp => {
      if (!emp.lastVacationResetDate) return true;
      const resetYear = emp.lastVacationResetDate.getFullYear();
      return resetYear < currentYear;
    });
  }

  async delete(id: string) {
    // Use includeInactive to find employee even if already deactivated
    const existing = await this.findById(id, true);
    if (!existing) {
      throw new NotFoundError("Employee not found");
    }

    // Check if already inactive
    if (!existing.isActive) {
      throw new ValidationError("Employee is already deactivated");
    }


    // Soft delete: set isActive to false instead of deleting
    await db
      .update(employees)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id));
  }
}

