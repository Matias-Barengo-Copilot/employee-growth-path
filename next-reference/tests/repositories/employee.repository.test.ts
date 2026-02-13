import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeRepository } from "@/lib/repositories/employee.repository";
import { ConflictError } from "@/lib/utils/errors";
import { db } from "@/db/client";
import { employees } from "@/db/schema";
import { createMockEmployee } from "../utils/test-helpers";

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("EmployeeRepository", () => {
  let repository: EmployeeRepository;

  beforeEach(() => {
    repository = new EmployeeRepository();
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new employee successfully", async () => {
      const employeeData = {
        companyId: "company_test123",
        name: "New Employee",
        email: "new@example.com",
        country: "USA",
        role: "employee" as const,
        roleType: "employee" as const,
        annualVacationDays: 0,
      };

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([createMockEmployee(employeeData)]),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(db.insert).mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>);

      const result = await repository.create(employeeData);

      expect(result).toBeDefined();
      expect(result.email).toBe(employeeData.email);
      expect(db.insert).toHaveBeenCalledWith(employees);
    });

    it("should throw ConflictError if employee with same email exists", async () => {
      const employeeData = {
        companyId: "company_test123",
        name: "New Employee",
        email: "existing@example.com",
        country: "USA",
        role: "employee" as const,
        roleType: "employee" as const,
        annualVacationDays: 0,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([createMockEmployee({ email: "existing@example.com" })]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      await expect(repository.create(employeeData)).rejects.toThrow(ConflictError);
    });

  });

  describe("findById", () => {
    it("should find employee by id", async () => {
      const mockEmployee = createMockEmployee({ id: "emp_test123" });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockEmployee]),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await repository.findById("emp_test123");

      expect(result).toBeDefined();
      expect(result?.id).toBe("emp_test123");
    });

    it("should return null if employee not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await repository.findById("emp_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByCompanyId", () => {
    it("should find all employees in a company", async () => {
      const mockEmployees = [
        createMockEmployee({ id: "emp1", companyId: "company_test123" }),
        createMockEmployee({ id: "emp2", companyId: "company_test123" }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEmployees),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const result = await repository.findByCompanyId("company_test123");

      expect(result).toHaveLength(2);
      expect(result[0].companyId).toBe("company_test123");
    });
  });
});

