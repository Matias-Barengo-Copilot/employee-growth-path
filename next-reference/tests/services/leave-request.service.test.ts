import { describe, it, expect, beforeEach, vi } from "vitest";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { LeaveRequestRepository } from "@/lib/repositories/leave-request.repository";
import { LeaveApprovalRepository } from "@/lib/repositories/leave-approval.repository";
import { EmployeeRepository } from "@/lib/repositories/employee.repository";
import { ValidationError, ForbiddenError } from "@/lib/utils/errors";
import { createMockUser, createMockLeaveRequest, createMockEmployee, createMockCompany } from "../utils/test-helpers";
import { db } from "@/db/client";

vi.mock("@/lib/repositories/leave-request.repository");
vi.mock("@/lib/repositories/leave-approval.repository");
vi.mock("@/lib/repositories/employee.repository");
vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

type MockLeaveRequestRepository = {
  create: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByEmployeeId: ReturnType<typeof vi.fn>;
  findByCompanyId: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
  withdraw: ReturnType<typeof vi.fn>;
};

type MockLeaveApprovalRepository = {
  createApprovalsForLeaveRequest: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
  findByLeaveRequestId: ReturnType<typeof vi.fn>;
  checkAllApproved: ReturnType<typeof vi.fn>;
  checkAnyRejected: ReturnType<typeof vi.fn>;
};

type MockEmployeeRepository = {
  findById: ReturnType<typeof vi.fn>;
};

describe("LeaveRequestService", () => {
  let service: LeaveRequestService;
  let mockLeaveRequestRepo: MockLeaveRequestRepository;
  let mockLeaveApprovalRepo: MockLeaveApprovalRepository;
  let mockEmployeeRepo: MockEmployeeRepository;

  beforeEach(() => {
    mockLeaveRequestRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmployeeId: vi.fn(),
      findByCompanyId: vi.fn(),
      updateStatus: vi.fn(),
      withdraw: vi.fn(),
    };

    mockLeaveApprovalRepo = {
      createApprovalsForLeaveRequest: vi.fn(),
      approve: vi.fn(),
      findByLeaveRequestId: vi.fn(),
      checkAllApproved: vi.fn(),
      checkAnyRejected: vi.fn(),
    };

    mockEmployeeRepo = {
      findById: vi.fn(),
    };

    vi.mocked(LeaveRequestRepository).mockImplementation(() => mockLeaveRequestRepo as unknown as LeaveRequestRepository);
    vi.mocked(LeaveApprovalRepository).mockImplementation(() => mockLeaveApprovalRepo as unknown as LeaveApprovalRepository);
    vi.mocked(EmployeeRepository).mockImplementation(() => mockEmployeeRepo as unknown as EmployeeRepository);

    service = new LeaveRequestService();
  });

  describe("submitLeaveRequest", () => {
    it("should submit leave request successfully", async () => {
      const user = createMockUser();
      const leaveRequestData = {
        leaveDays: [
          { date: "2024-01-15", leaveType: "vacation" as const, isHalfDay: false },
          { date: "2024-01-16", leaveType: "vacation" as const, isHalfDay: false },
          { date: "2024-01-17", leaveType: "vacation" as const, isHalfDay: false },
          { date: "2024-01-18", leaveType: "vacation" as const, isHalfDay: false },
          { date: "2024-01-19", leaveType: "vacation" as const, isHalfDay: false },
        ],
        reason: "Vacation",
        projects: [
          {
            projectName: "Test Project",
            pmId: "pm_test123",
            techLeadId: "tech_lead_test123",
          },
        ],
      };

      const mockEmployee = createMockEmployee({ companyId: "company_test123" });
      const mockCompany = createMockCompany({ id: "company_test123" });
      const mockLeaveRequest = createMockLeaveRequest({ id: "leave_new123" });

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      // Projects validation removed - projects are now text-based
      mockLeaveRequestRepo.create.mockResolvedValue(mockLeaveRequest);
      mockLeaveRequestRepo.findById.mockResolvedValue({
        ...mockLeaveRequest,
        projects: [],
        approvals: [],
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCompany]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      mockLeaveApprovalRepo.createApprovalsForLeaveRequest.mockResolvedValue([]);

      const result = await service.submitLeaveRequest(leaveRequestData, user);

      expect(result).toBeDefined();
      expect(mockLeaveRequestRepo.create).toHaveBeenCalled();
      expect(mockLeaveApprovalRepo.createApprovalsForLeaveRequest).toHaveBeenCalled();
    });

    it("should throw ValidationError if fromDate is after toDate", async () => {
      const user = createMockUser();
      const leaveRequestData = {
        leaveDays: [
          { date: "2024-01-20", leaveType: "vacation" as const, isHalfDay: false },
          { date: "2024-01-15", leaveType: "vacation" as const, isHalfDay: false },
        ],
        projects: [{ projectName: "Test Project", pmId: "pm_test123", techLeadId: "tech_lead_test123" }],
      };

      await expect(service.submitLeaveRequest(leaveRequestData, user)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError if fromDate is in the past", async () => {
      const user = createMockUser();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const leaveRequestData = {
        leaveDays: [
          { date: yesterday.toISOString().split("T")[0], leaveType: "vacation" as const, isHalfDay: false },
          { date: "2024-01-20", leaveType: "vacation" as const, isHalfDay: false },
        ],
        projects: [{ projectName: "Test Project", pmId: "pm_test123", techLeadId: "tech_lead_test123" }],
      };

      await expect(service.submitLeaveRequest(leaveRequestData, user)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("approveLeaveRequest", () => {
    it("should approve leave request as supervisor", async () => {
      const user = createMockUser({ role: "supervisor", employeeId: "emp_supervisor123" });
      const approvalData = {
        leaveRequestId: "leave_test123",
        status: "approved" as const,
        comments: "Approved",
      };

      const mockLeaveRequest = {
        ...createMockLeaveRequest({ id: "leave_test123" }),
        projects: [
          {
            project: {
              supervisorId: "emp_supervisor123",
            },
          },
        ],
      };

      mockLeaveRequestRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockLeaveApprovalRepo.approve.mockResolvedValue({});
      mockLeaveApprovalRepo.checkAllApproved.mockResolvedValue(true);
      mockLeaveApprovalRepo.checkAnyRejected.mockResolvedValue(false);
      mockLeaveRequestRepo.updateStatus.mockResolvedValue({
        ...mockLeaveRequest,
        overallStatus: "approved",
      });
      mockLeaveRequestRepo.findById.mockResolvedValue({
        ...mockLeaveRequest,
        overallStatus: "approved",
      });

      const result = await service.approveLeaveRequest(approvalData, user);

      expect(result).toBeDefined();
      expect(mockLeaveApprovalRepo.approve).toHaveBeenCalled();
      expect(mockLeaveRequestRepo.updateStatus).toHaveBeenCalledWith(
        "leave_test123",
        "approved"
      );
    });

    it("should throw ForbiddenError if supervisor is not authorized", async () => {
      const user = createMockUser({ role: "supervisor", employeeId: "emp_other123" });
      const approvalData = {
        leaveRequestId: "leave_test123",
        status: "approved" as const,
      };

      const mockLeaveRequest = {
        ...createMockLeaveRequest({ id: "leave_test123" }),
        projects: [
          {
            project: {
              supervisorId: "emp_supervisor123",
            },
          },
        ],
      };

      mockLeaveRequestRepo.findById.mockResolvedValue(mockLeaveRequest);

      await expect(service.approveLeaveRequest(approvalData, user)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe("withdrawLeaveRequest", () => {
    it("should withdraw leave request successfully", async () => {
      const user = createMockUser({ employeeId: "emp_test123" });
      const withdrawData = {
        leaveRequestId: "leave_test123",
      };

      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_test123",
        employeeId: "emp_test123",
        overallStatus: "pending",
      });

      mockLeaveRequestRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockLeaveApprovalRepo.findByLeaveRequestId.mockResolvedValue([
        { approverRole: "hr", status: "pending" },
      ]);
      mockLeaveRequestRepo.withdraw.mockResolvedValue({
        ...mockLeaveRequest,
        overallStatus: "cancelled",
      });

      const result = await service.withdrawLeaveRequest(withdrawData, user);

      expect(result).toBeDefined();
      expect(mockLeaveRequestRepo.withdraw).toHaveBeenCalled();
    });

    it("should throw ForbiddenError if user is not the requester", async () => {
      const user = createMockUser({ employeeId: "emp_other123" });
      const withdrawData = {
        leaveRequestId: "leave_test123",
      };

      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_test123",
        employeeId: "emp_test123",
      });

      mockLeaveRequestRepo.findById.mockResolvedValue(mockLeaveRequest);

      await expect(service.withdrawLeaveRequest(withdrawData, user)).rejects.toThrow(
        ForbiddenError
      );
    });

    it("should throw ValidationError if HR has already approved", async () => {
      const user = createMockUser({ employeeId: "emp_test123" });
      const withdrawData = {
        leaveRequestId: "leave_test123",
      };

      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_test123",
        employeeId: "emp_test123",
        overallStatus: "pending",
      });

      mockLeaveRequestRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockLeaveApprovalRepo.findByLeaveRequestId.mockResolvedValue([
        { approverRole: "hr", status: "approved" },
      ]);

      await expect(service.withdrawLeaveRequest(withdrawData, user)).rejects.toThrow(
        ValidationError
      );
    });
  });
});

