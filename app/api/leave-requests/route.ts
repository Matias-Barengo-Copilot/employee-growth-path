import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { SubmitLeaveRequestDto, GetLeaveRequestsQueryDto } from "@/lib/types";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = SubmitLeaveRequestDto.parse(body);

    const service = new LeaveRequestService();
    const leaveRequest = await service.submitLeaveRequest(data, user);

    return successResponse(leaveRequest, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    
    // Convert null to undefined for optional fields (searchParams.get returns null, but Zod expects undefined)
    const query = GetLeaveRequestsQueryDto.parse({
      employeeId: searchParams.get("employeeId") || undefined,
      status: searchParams.get("status") || undefined,
      companyId: searchParams.get("companyId") || undefined,
      organizationId: searchParams.get("organizationId") || undefined,
      leaveType: searchParams.get("leaveType") || undefined,
      fromDate: searchParams.get("fromDate") || undefined,
      toDate: searchParams.get("toDate") || undefined,
      view: searchParams.get("view") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const service = new LeaveRequestService();
    const leaveRequests = await service.getLeaveRequests(query, user);

    return successResponse(leaveRequests);
  } catch (error) {
    logger.error('Error in GET /api/leave-requests:', error);
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }
    return errorResponse(error);
  }
}

