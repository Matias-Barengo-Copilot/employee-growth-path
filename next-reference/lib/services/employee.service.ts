import { EmployeeRepository } from "../repositories/employee.repository";
import { CreateEmployeeInput, UpdateEmployeeInput, PaginatedResponse, PaginationMetadata } from "../types";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { AuthenticatedUser } from "../middleware/auth";
import { EmployeeListItem } from "../types/employee";

export class EmployeeService {
  private employeeRepository: EmployeeRepository;

  constructor() {
    this.employeeRepository = new EmployeeRepository();
  }

  async createEmployee(data: CreateEmployeeInput, user: AuthenticatedUser) {
    // Only HR can create employees
    if (user.role !== "hr") {
      throw new ForbiddenError("Only HR can create employees");
    }

    return this.employeeRepository.create(data);
  }

  async getEmployeeById(id: string, user: AuthenticatedUser) {
    const employee = await this.employeeRepository.findById(id);

    if (!employee) {
      return null;
    }

    if (employee.companyId !== user.companyId) {
      throw new ForbiddenError("Access denied");
    }

    return employee;
  }

  async getEmployees(
    user: AuthenticatedUser,
    filters?: { companyId?: string; roles?: string[]; search?: string },
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EmployeeListItem>> {
    let effectiveFilters: { companyId?: string; roles?: string[]; search?: string };

    const companyId = filters?.companyId || user.companyId;
    effectiveFilters = { companyId, roles: filters?.roles, search: filters?.search };

    const data = await this.employeeRepository.findByFilters(effectiveFilters, page, limit);
    const total = await this.employeeRepository.countByFilters(effectiveFilters);

    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      data,
      pagination,
    };
  }

  async updateEmployee(id: string, data: UpdateEmployeeInput, user: AuthenticatedUser) {
    if (user.role !== "hr" && user.employeeId !== id) {
      throw new ForbiddenError("Only HR or the profile owner can update employees");
    }

    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new Error("Employee not found");
    }

    if (user.employeeId === id && user.role !== "hr") {
      const { name, email, country, role, roleType, joiningDate, birthday, ...profileFields } = data;
      return this.employeeRepository.update(id, profileFields);
    }

    return this.employeeRepository.update(id, data);
  }

  async deleteEmployee(id: string, user: AuthenticatedUser) {
    if (user.role !== "hr") {
      throw new ForbiddenError("Only HR can deactivate employees");
    }

    // Use includeInactive to check if employee exists (even if already deactivated)
    const employee = await this.employeeRepository.findById(id, true);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Soft delete: sets isActive = false
    await this.employeeRepository.delete(id);
  }

  /**
   * Reset vacation days for all employees who need it (new year)
   * Only HR can execute this operation
   */
  async resetVacationDaysForNewYear(user: AuthenticatedUser): Promise<number> {
    // Only HR can reset vacation days
    if (user.role !== "hr") {
      throw new ForbiddenError("Only HR can reset vacation days");
    }

    // Find employees that need reset
    const employeesNeedingReset = await this.employeeRepository.findEmployeesNeedingReset();
    
    if (employeesNeedingReset.length === 0) {
      return 0;
    }

    const employeeIds = employeesNeedingReset.map(emp => emp.id);
    return await this.employeeRepository.resetVacationDaysForNewYear(employeeIds);
  }
}

