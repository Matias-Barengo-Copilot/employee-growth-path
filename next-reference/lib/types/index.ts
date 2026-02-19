import { z } from "zod";
import { parseLocalDate } from "@/lib/utils/date";

// Employee Role Enum
export type EmployeeRole = "employee" | "supervisor" | "hr";

// Employee Role Type Enum (Employee/Individual Contractor)
export type EmployeeRoleType = "employee" | "individual_contractor";

// Leave Type Enum
export type LeaveType = "vacation" | "personal_sick" | "unpaid" | "other";

// Leave Request Status Enum
export type LeaveRequestStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

// Approval Status Enum
export type ApprovalStatus = "pending" | "approved" | "rejected";

// Approver Role Enum
export type ApproverRole = "supervisor" | "hr";

// DTOs
export const CreateEmployeeDto = z.object({
  companyId: z.string().uuid().optional(), // Opcional, se usa el del admin o se crea por defecto
  name: z.string().min(1),
  email: z.string().email(),
  country: z.string().min(1),
  role: z.enum(["employee", "supervisor", "hr"]),
  roleType: z.enum(["employee", "individual_contractor"]).default("employee"),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
});

export const UpdateEmployeeDto = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  country: z.string().min(1).optional(),
  role: z.enum(["employee", "supervisor", "hr"]).optional(),
  roleType: z.enum(["employee", "individual_contractor"]).optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: z.string().max(255).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  slackHandle: z.string().max(100).optional().nullable(),
  whatIDo: z.string().max(500).optional().nullable(),
  workingPreferences: z.string().max(500).optional().nullable(),
  currentlyWorkingOn: z.string().max(200).optional().nullable(),
  strengths: z.array(z.string()).optional().nullable(),
  funFacts: z.array(z.string()).optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
});

// Simplified project model for leave requests
export const LeaveRequestProjectDto = z.object({
  projectName: z.string().min(1, "Project name is required").max(255, "Project name is too long"),
  pmId: z.string().min(1, "Project Manager is required").uuid("Project Manager must be a valid employee"),
  techLeadId: z.string().min(1, "Tech Lead is required").uuid("Tech Lead must be a valid employee"),
});

// Relaxed project model for drafts - allows optional pmId and techLeadId
export const LeaveRequestProjectDraftDto = z.object({
  projectName: z.string().min(1, "Project name is required").max(255, "Project name is too long"),
  pmId: z.union([
    z.string().uuid("Project Manager must be a valid employee"),
    z.literal(""),
    z.undefined()
  ]).optional().transform((val) => val === "" ? undefined : val),
  techLeadId: z.union([
    z.string().uuid("Tech Lead must be a valid employee"),
    z.literal(""),
    z.undefined()
  ]).optional().transform((val) => val === "" ? undefined : val),
});

// Leave Day DTO for individual day selection
export const LeaveRequestDayDto = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
  leaveType: z.enum(["vacation", "personal_sick", "unpaid", "other"]),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(["morning", "afternoon"]).optional(),
});

export const SubmitLeaveRequestDto = z.object({
  leaveDays: z.array(LeaveRequestDayDto).min(1, "At least one leave day is required"),
  reason: z.string().optional(),
  projects: z.array(LeaveRequestProjectDto).min(1, "At least one project is required"),
}).refine((data) => {
  // Validate that all dates are not weekends
  const weekendDays = data.leaveDays.filter(day => {
    const date = parseLocalDate(day.date);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  });
  
  if (weekendDays.length > 0) {
    const weekendDates = weekendDays.map(day => {
      const date = parseLocalDate(day.date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      return `${day.date} (${dayName})`;
    }).join(', ');
    
    throw new z.ZodError([{
      code: 'custom',
      path: ['leaveDays'],
      message: `Weekends are not allowed for leave requests. Invalid dates: ${weekendDates}`,
    }]);
  }
  
  return true;
}, {
  message: "Weekends are not allowed for leave requests",
  path: ["leaveDays"],
});

// Draft DTO - more lenient validation for drafts
export const SaveDraftDto = z.object({
  leaveDays: z.array(LeaveRequestDayDto).optional(),
  reason: z.string().optional(),
  projects: z.array(LeaveRequestProjectDraftDto).optional(),
});

export const ApproveLeaveRequestDto = z.object({
  leaveRequestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  comments: z.string().optional(),
});

export const WithdrawLeaveRequestDto = z.object({
  leaveRequestId: z.string().uuid(),
});

export const GetLeaveRequestsQueryDto = z.object({
  employeeId: z.string().uuid().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected", "cancelled"]).optional(),
  companyId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  leaveType: z.enum(["vacation", "personal_sick", "unpaid", "other"]).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** When "approvals": supervisor sees only requests that reach them as supervisor. When "all": view-all sees company-wide. */
  view: z.enum(["approvals", "all"]).optional(),
  page: z.string().optional().transform((val) => {
    const parsed = val ? parseInt(val, 10) : 1;
    return isNaN(parsed) ? 1 : Math.max(1, parsed);
  }),
  limit: z.string().optional().transform((val) => {
    const parsed = val ? parseInt(val, 10) : 20;
    // Ensure limit is between 1 and 100
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(100, parsed));
  }),
});

export const CreateProjectDto = z.object({
  name: z.string().min(1, "Project name is required").max(255, "Project name is too long"),
  description: z.string().optional(),
  pmId: z.string().uuid("PM ID must be a valid UUID"), // PM is required, stored as supervisorId for now
  techLeadId: z.string().uuid("Tech Lead ID must be a valid UUID").optional(), // Tech Lead is optional (future: will be stored separately)
});

export const UpdateProjectDto = z.object({
  name: z.string().min(1, "Project name is required").max(255, "Project name is too long").optional(),
  description: z.string().optional(),
  pmId: z.string().uuid("PM ID must be a valid UUID").optional(),
  techLeadId: z.string().uuid("Tech Lead ID must be a valid UUID").optional(),
});

// DTOs for employee project assignments
export const AssignEmployeesToProjectDto = z.object({
  employees: z.array(
    z.object({
      employeeId: z.string().uuid("Employee ID must be a valid UUID"),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().or(z.literal('')),
      role: z.string().optional(), // Role of employee within the project (no validation for now)
    })
  ).min(1, "At least one employee must be assigned"),
});

export const UpdateEmployeeProjectAssignmentDto = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().or(z.literal('')),
  role: z.string().optional(), // Role of employee within the project (no validation for now)
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeDto>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeDto>;

// Pagination Types
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}
export type LeaveRequestProject = z.infer<typeof LeaveRequestProjectDto>;
export type SubmitLeaveRequestInput = z.infer<typeof SubmitLeaveRequestDto>;
export type SaveDraftInput = z.infer<typeof SaveDraftDto>;
export type ApproveLeaveRequestInput = z.infer<typeof ApproveLeaveRequestDto>;
export type WithdrawLeaveRequestInput = z.infer<typeof WithdrawLeaveRequestDto>;
export type GetLeaveRequestsQuery = z.infer<typeof GetLeaveRequestsQueryDto>;
export type CreateProjectInput = z.infer<typeof CreateProjectDto>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectDto>;
export type AssignEmployeesToProjectInput = z.infer<typeof AssignEmployeesToProjectDto>;
export type UpdateEmployeeProjectAssignmentInput = z.infer<typeof UpdateEmployeeProjectAssignmentDto>;

