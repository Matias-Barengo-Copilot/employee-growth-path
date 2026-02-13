import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { successResponse, errorResponse } from "@/lib/utils/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const service = new LeaveRequestService();
    const leaveRequest = await service.getLeaveRequestById(id, user);

    if (!leaveRequest) {
      return errorResponse(new Error("Leave request not found"));
    }

    return successResponse(leaveRequest);
  } catch (error) {
    return errorResponse(error);
  }
}

