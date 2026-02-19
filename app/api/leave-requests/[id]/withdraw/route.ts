import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { WithdrawLeaveRequestDto } from "@/lib/types";
import { successResponse, errorResponse } from "@/lib/utils/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const data = WithdrawLeaveRequestDto.parse({
      leaveRequestId: id,
    });

    const service = new LeaveRequestService();
    const leaveRequest = await service.withdrawLeaveRequest(data, user);

    return successResponse(leaveRequest);
  } catch (error) {
    return errorResponse(error);
  }
}

