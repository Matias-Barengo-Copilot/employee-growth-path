import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { ForbiddenError } from "@/lib/utils/errors";
import { canViewAllLeaveRequests } from "@/lib/utils/view-all-leave-requests";

/**
 * GET /api/leave-requests/totals
 * Returns leave totals by employee for the current year (approved only).
 * Allowed: HR or users in VIEW_ALL_LEAVE_REQUESTS_EMAILS.
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (user.role !== "hr" && !canViewAllLeaveRequests(user)) {
      throw new ForbiddenError("Only HR or users with leave totals access can view this");
    }

    const year = new Date().getFullYear();
    const service = new LeaveRequestService();
    const totals = await service.getLeaveTotalsByEmployee(user.companyId, year);

    return successResponse(totals);
  } catch (error) {
    return errorResponse(error);
  }
}
