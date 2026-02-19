import { describe, it, expect, beforeEach, vi } from "vitest";
import { LeaveRequestRepository } from "@/lib/repositories/leave-request.repository";
import { NotFoundError } from "@/lib/utils/errors";
import { db } from "@/db/client";
import { leaveRequests, leaveRequestProjects } from "@/db/schema";
import { createMockLeaveRequest } from "../utils/test-helpers";

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

describe("LeaveRequestRepository", () => {
  let repository: LeaveRequestRepository;

  beforeEach(() => {
    repository = new LeaveRequestRepository();
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a leave request with projects", async () => {
      const leaveRequestData = {
        employeeId: "emp_test123",
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

      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_new123",
        ...leaveRequestData,
      });

      const mockInsertLeaveRequest = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockLeaveRequest]),
      };

      const mockInsertProjects = {
        values: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.insert).mockImplementation((table: unknown) => {
        if (table === leaveRequests) {
          return mockInsertLeaveRequest as unknown as ReturnType<typeof db.insert>;
        }
        if (table === leaveRequestProjects) {
          return mockInsertProjects as unknown as ReturnType<typeof db.insert>;
        }
        return {} as unknown as ReturnType<typeof db.insert>;
      });

      const result = await repository.create(leaveRequestData);

      expect(result).toBeDefined();
      expect(result.id).toBe("leave_new123");
      expect(db.insert).toHaveBeenCalledWith(leaveRequests);
      expect(db.insert).toHaveBeenCalledWith(leaveRequestProjects);
    });
  });

  describe("findById", () => {
    it("should find leave request with projects and approvals", async () => {
      const mockLeaveRequest = createMockLeaveRequest({ id: "leave_test123" });
      const mockProjects = [
        {
          id: "lr_project1",
          projectId: "project_test123",
          informedPm: true,
          informedTechLead: false,
          project: {
            id: "project_test123",
            name: "Test Project",
            supervisorId: "emp_supervisor123",
          },
        },
      ];
      const mockApprovals = [
        {
          id: "approval1",
          approverId: "emp_supervisor123",
          approverRole: "supervisor" as const,
          status: "pending" as const,
          comments: null,
          decidedAt: null,
          createdAt: new Date(),
          approver: {
            id: "emp_supervisor123",
            name: "Supervisor",
            role: "supervisor" as const,
          },
        },
      ];

      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockLeaveRequest]),
                }),
              }),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        if (callCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockProjects),
              }),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockApprovals),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      });

      const result = await repository.findById("leave_test123");

      expect(result).toBeDefined();
      expect(result?.id).toBe("leave_test123");
      expect(result?.projects).toBeDefined();
      expect(result?.approvals).toBeDefined();
    });

    it("should return null if leave request not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
          } as unknown as ReturnType<typeof db.select>);

      const result = await repository.findById("leave_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("should update leave request status", async () => {
      const mockUpdated = createMockLeaveRequest({
        id: "leave_test123",
        overallStatus: "approved",
      });

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdated]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      const result = await repository.updateStatus("leave_test123", "approved");

      expect(result).toBeDefined();
      expect(result.overallStatus).toBe("approved");
      expect(db.update).toHaveBeenCalledWith(leaveRequests);
    });

    it("should throw NotFoundError if leave request not found", async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      await expect(
        repository.updateStatus("leave_nonexistent", "approved")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("withdraw", () => {
    it("should withdraw leave request", async () => {
      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_test123",
        employeeId: "emp_test123",
        overallStatus: "pending",
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockLeaveRequest]),
          }),
        }),
          } as unknown as ReturnType<typeof db.select>);

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          { ...mockLeaveRequest, overallStatus: "cancelled" },
        ]),
      };

      vi.mocked(db.update).mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>);

      const result = await repository.withdraw("leave_test123", "emp_test123");

      expect(result.overallStatus).toBe("cancelled");
    });

    it("should throw NotFoundError if leave request not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
          } as unknown as ReturnType<typeof db.select>);

      await expect(
        repository.withdraw("leave_nonexistent", "emp_test123")
      ).rejects.toThrow(NotFoundError);
    });
  });
});

