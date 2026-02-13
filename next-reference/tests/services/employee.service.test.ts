import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeService } from "@/lib/services/employee.service";
import { EmployeeRepository } from "@/lib/repositories/employee.repository";
import { ForbiddenError } from "@/lib/utils/errors";
import { createMockUser, createMockEmployee } from "../utils/test-helpers";

vi.mock("@/lib/repositories/employee.repository");

type MockEmployeeRepository = {
  create: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByClerkId: ReturnType<typeof vi.fn>;
  findByCompanyId: ReturnType<typeof vi.fn>;
  findByOrganizationId: ReturnType<typeof vi.fn>;
};

describe("EmployeeService", () => {
  let service: EmployeeService;
  let mockRepository: MockEmployeeRepository;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByClerkId: vi.fn(),
      findByCompanyId: vi.fn(),
      findByOrganizationId: vi.fn(),
    };

    vi.mocked(EmployeeRepository).mockImplementation(() => mockRepository as unknown as EmployeeRepository);
    service = new EmployeeService();
  });

  describe("createEmployee", () => {
    it("should create employee if user is HR", async () => {
      const user = createMockUser({ role: "hr" });
      const employeeData = {
        name: "New Employee",
        email: "new@example.com",
        country: "USA",
        role: "employee" as const,
        roleType: "employee" as const,
        annualVacationDays: 0,
        companyId: "company_test123",
      };

      const mockEmployee = createMockEmployee(employeeData);
      mockRepository.create.mockResolvedValue(mockEmployee);

      const result = await service.createEmployee(employeeData, user);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(employeeData);
    });

    it("should throw ForbiddenError if user is not HR", async () => {
      const user = createMockUser({ role: "employee" });
      const employeeData = {
        name: "New Employee",
        email: "new@example.com",
        country: "USA",
        role: "employee" as const,
        roleType: "employee" as const,
        annualVacationDays: 0,
        companyId: "company_test123",
      };

      await expect(service.createEmployee(employeeData, user)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe("getEmployeeById", () => {
    it("should return employee if HR", async () => {
      const user = createMockUser({ role: "hr" });
      const mockEmployee = createMockEmployee({ id: "emp_test123" });
      mockRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById("emp_test123", user);

      expect(result).toBeDefined();
      expect(mockRepository.findById).toHaveBeenCalledWith("emp_test123");
    });

    it("should return employee if HR and employee is in same company", async () => {
      const user = createMockUser({ role: "hr", companyId: "company_test123" });
      const mockEmployee = createMockEmployee({
        id: "emp_test123",
        companyId: "company_test123",
      });
      mockRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById("emp_test123", user);

      expect(result).toBeDefined();
    });

    it("should return employee if viewing own profile", async () => {
      const user = createMockUser({ employeeId: "emp_test123" });
      const mockEmployee = createMockEmployee({ id: "emp_test123" });
      mockRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById("emp_test123", user);

      expect(result).toBeDefined();
    });

    it("should throw ForbiddenError if HR tries to view employee from different company", async () => {
      const user = createMockUser({ role: "hr", companyId: "company_test123" });
      const mockEmployee = createMockEmployee({
        id: "emp_other",
        companyId: "company_other",
      });
      mockRepository.findById.mockResolvedValue(mockEmployee);

      await expect(service.getEmployeeById("emp_other", user)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe("getEmployees", () => {
    it("should return all employees if HR", async () => {
      const user = createMockUser({ role: "hr", companyId: "company_test123" });
      const mockEmployees = [
        createMockEmployee({ id: "emp1" }),
        createMockEmployee({ id: "emp2" }),
      ];
      mockRepository.findByCompanyId.mockResolvedValue(mockEmployees);

      const result = await service.getEmployees(user);

      expect(result).toHaveLength(2);
      expect(mockRepository.findByCompanyId).toHaveBeenCalledWith("company_test123");
    });

    it("should return company employees if HR", async () => {
      const user = createMockUser({ role: "hr", companyId: "company_test123" });
      const mockEmployees = [createMockEmployee({ id: "emp1" })];
      mockRepository.findByCompanyId.mockResolvedValue(mockEmployees);

      const result = await service.getEmployees(user);

      expect(result).toHaveLength(1);
    });

    it("should return only own employee if regular employee", async () => {
      const user = createMockUser({ role: "employee", employeeId: "emp_test123" });
      const mockEmployee = createMockEmployee({ id: "emp_test123" });
      mockRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.getEmployees(user);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("emp_test123");
    });
  });
});

