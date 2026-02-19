import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "@/app/api/employees/route";
import { GET as GET_BY_ID } from "@/app/api/employees/[id]/route";
import { EmployeeService } from "@/lib/services/employee.service";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { createMockUser, createMockEmployee } from "../utils/test-helpers";
import { NextRequest } from "next/server";

vi.mock("@/lib/middleware/auth");
vi.mock("@/lib/services/employee.service");

type MockEmployeeService = {
  createEmployee: ReturnType<typeof vi.fn>;
  getEmployees: ReturnType<typeof vi.fn>;
  getEmployeeById: ReturnType<typeof vi.fn>;
};

describe("Employees API", () => {
  let mockService: MockEmployeeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      createEmployee: vi.fn(),
      getEmployees: vi.fn(),
      getEmployeeById: vi.fn(),
    };
    vi.mocked(EmployeeService).mockImplementation(() => mockService as unknown as EmployeeService);
  });

  describe("POST /api/employees", () => {
    it("should create employee successfully", async () => {
      const user = createMockUser({ role: "hr" });
      const employeeData = {
        companyId: "company_test123",
        name: "New Employee",
        email: "new@example.com",
        country: "USA",
        role: "employee" as const,
      };

      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.createEmployee.mockResolvedValue(createMockEmployee(employeeData));

      const request = new NextRequest("http://localhost/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockService.createEmployee).toHaveBeenCalledWith(employeeData, user);
    });

    it("should return 400 for invalid data", async () => {
      const user = createMockUser({ role: "hr" });
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);

      const request = new NextRequest("http://localhost/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "data" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: "company_test123",
          name: "New Employee",
          email: "new@example.com",
          country: "USA",
          role: "employee",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/employees", () => {
    it("should return list of employees", async () => {
      const user = createMockUser({ role: "hr" });
      const mockEmployees = [
        createMockEmployee({ id: "emp1" }),
        createMockEmployee({ id: "emp2" }),
      ];

      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.getEmployees.mockResolvedValue(mockEmployees);

      const request = new NextRequest("http://localhost/api/employees", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(mockService.getEmployees).toHaveBeenCalledWith(user);
    });
  });

  describe("GET /api/employees/[id]", () => {
    it("should return employee by id", async () => {
      const user = createMockUser({ role: "hr" });
      const mockEmployee = createMockEmployee({ id: "emp_test123" });

      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.getEmployeeById.mockResolvedValue(mockEmployee);

      const request = new NextRequest("http://localhost/api/employees/emp_test123", {
        method: "GET",
      });

      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: "emp_test123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("emp_test123");
      expect(mockService.getEmployeeById).toHaveBeenCalledWith("emp_test123", user);
    });

    it("should return 404 if employee not found", async () => {
      const user = createMockUser({ role: "hr" });
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.getEmployeeById.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/employees/emp_nonexistent", {
        method: "GET",
      });

      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: "emp_nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
    });
  });
});

