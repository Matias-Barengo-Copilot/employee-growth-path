import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { SaveDraftDto } from "@/lib/types";
import { successResponse, errorResponse } from "@/lib/utils/response";

/**
 * PUT /api/leave-requests/draft/[id]
 * Update an existing draft
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = SaveDraftDto.parse(body);

    const service = new LeaveRequestService();
    const draft = await service.saveDraft(data, user, id);

    return successResponse(draft);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/leave-requests/draft/[id]
 * Delete a draft
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    const service = new LeaveRequestService();
    await service.deleteDraft(id, user);

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
