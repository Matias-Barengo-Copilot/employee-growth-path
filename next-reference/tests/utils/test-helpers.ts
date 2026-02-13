import { AuthenticatedUser } from "@/lib/middleware/auth";
import { EmployeeData } from "@/lib/types/employee";

export const createMockUser = (overrides?: Partial<AuthenticatedUser>): AuthenticatedUser => ({
  employeeId: "emp_test123",
  role: "employee",
  companyId: "company_test123",
  email: "test@example.com",
  name: "Test User",
  ...overrides,
});

export const createMockEmployee = (overrides?: Partial<EmployeeData>): EmployeeData => ({
  id: "emp_test123",
  companyId: "company_test123",
  name: "Test User",
  email: "test@example.com",
  country: "USA",
  role: "employee",
  roleType: "employee",
  joiningDate: null,
  birthday: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type MockLeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  overallStatus: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
};

export const createMockLeaveRequest = (overrides?: Partial<MockLeaveRequest>): MockLeaveRequest => ({
  id: "leave_test123",
  employeeId: "emp_test123",
  leaveType: "annual",
  fromDate: "2024-01-15",
  toDate: "2024-01-20",
  totalDays: 5,
  reason: "Vacation",
  overallStatus: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type MockProject = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  supervisorId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
};

export const createMockProject = (overrides?: Partial<MockProject>): MockProject => ({
  id: "project_test123",
  companyId: "company_test123",
  name: "Test Project",
  description: "Test Description",
  supervisorId: "emp_supervisor123",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type MockCompany = {
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
};

export const createMockCompany = (overrides?: Partial<MockCompany>): MockCompany => ({
  id: "company_test123",
  organizationId: "org_test123",
  name: "Test Company",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

