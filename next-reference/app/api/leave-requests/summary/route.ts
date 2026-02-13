import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { ForbiddenError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    
    // Get employeeId from query params, default to current user
    const employeeId = searchParams.get("employeeId") || user.employeeId;

    // Users can only view their own summary unless they are HR
    if (employeeId !== user.employeeId && user.role !== "hr") {
      throw new ForbiddenError("You can only view your own leave summary");
    }

    const service = new LeaveRequestService();
    const summary = await service.getLeaveDaysAvailedSummary(employeeId);

    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
