import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, GET } from "@/app/api/leave-requests/route";
import { POST as APPROVE } from "@/app/api/leave-requests/[id]/approve/route";
import { POST as WITHDRAW } from "@/app/api/leave-requests/[id]/withdraw/route";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { createMockUser, createMockLeaveRequest } from "../utils/test-helpers";
import { NextRequest } from "next/server";

vi.mock("@/lib/middleware/auth");
vi.mock("@/lib/services/leave-request.service");

type MockLeaveRequestService = {
  submitLeaveRequest: ReturnType<typeof vi.fn>;
  getLeaveRequests: ReturnType<typeof vi.fn>;
  getLeaveRequestById: ReturnType<typeof vi.fn>;
  approveLeaveRequest: ReturnType<typeof vi.fn>;
  withdrawLeaveRequest: ReturnType<typeof vi.fn>;
};

describe("Leave Requests API", () => {
  let mockService: MockLeaveRequestService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      submitLeaveRequest: vi.fn(),
      getLeaveRequests: vi.fn(),
      getLeaveRequestById: vi.fn(),
      approveLeaveRequest: vi.fn(),
      withdrawLeaveRequest: vi.fn(),
    };
    vi.mocked(LeaveRequestService).mockImplementation(() => mockService as unknown as LeaveRequestService);
  });

  describe("POST /api/leave-requests", () => {
    it("should submit leave request successfully", async () => {
      const user = createMockUser();
      const leaveRequestData = {
        leaveType: "annual" as const,
        fromDate: "2024-01-15",
        toDate: "2024-01-20",
        totalDays: 5,
        reason: "Vacation",
        projects: [
          {
            projectId: "project_test123",
            informedPm: true,
            informedTechLead: false,
          },
        ],
      };

      const mockLeaveRequest = createMockLeaveRequest({ id: "leave_new123" });
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.submitLeaveRequest.mockResolvedValue(mockLeaveRequest);

      const request = new NextRequest("http://localhost/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveRequestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockService.submitLeaveRequest).toHaveBeenCalledWith(leaveRequestData, user);
    });

    it("should return 400 for invalid data", async () => {
      const user = createMockUser();
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);

      const request = new NextRequest("http://localhost/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "data" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/leave-requests", () => {
    it("should return list of leave requests", async () => {
      const user = createMockUser();
      const mockLeaveRequests = [
        createMockLeaveRequest({ id: "leave1" }),
        createMockLeaveRequest({ id: "leave2" }),
      ];

      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.getLeaveRequests.mockResolvedValue(mockLeaveRequests);

      const request = new NextRequest("http://localhost/api/leave-requests", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it("should handle query parameters", async () => {
      const user = createMockUser();
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.getLeaveRequests.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/leave-requests?status=pending&page=1&limit=10",
        {
          method: "GET",
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockService.getLeaveRequests).toHaveBeenCalled();
    });
  });

  describe("POST /api/leave-requests/[id]/approve", () => {
    it("should approve leave request successfully", async () => {
      const user = createMockUser({ role: "supervisor" });
      const approvalData = {
        status: "approved" as const,
        comments: "Approved",
      };

      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_test123",
        overallStatus: "approved",
      });

      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.approveLeaveRequest.mockResolvedValue(mockLeaveRequest);

      const request = new NextRequest("http://localhost/api/leave-requests/leave_test123/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalData),
      });

      const response = await APPROVE(request, { params: Promise.resolve({ id: "leave_test123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockService.approveLeaveRequest).toHaveBeenCalled();
    });
  });

  describe("POST /api/leave-requests/[id]/withdraw", () => {
    it("should withdraw leave request successfully", async () => {
      const user = createMockUser();
      const mockLeaveRequest = createMockLeaveRequest({
        id: "leave_test123",
        overallStatus: "cancelled",
      });

      vi.mocked(getAuthenticatedUser).mockResolvedValue(user);
      mockService.withdrawLeaveRequest.mockResolvedValue(mockLeaveRequest);

      const request = new NextRequest("http://localhost/api/leave-requests/leave_test123/withdraw", {
        method: "POST",
      });

      const response = await WITHDRAW(request, { params: Promise.resolve({ id: "leave_test123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overallStatus).toBe("cancelled");
      expect(mockService.withdrawLeaveRequest).toHaveBeenCalled();
    });
  });
});

