import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { successResponse, errorResponse } from "@/lib/utils/response";

/**
 * POST /api/leave-requests/draft/[id]/submit
 * Submit a draft (convert to pending leave request)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    const service = new LeaveRequestService();
    const leaveRequest = await service.submitDraft(id, user);

    return successResponse(leaveRequest);
  } catch (error) {
    return errorResponse(error);
  }
}

