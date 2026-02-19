import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { LeaveRequestService } from "@/lib/services/leave-request.service";
import { SaveDraftDto } from "@/lib/types";
import { successResponse, errorResponse } from "@/lib/utils/response";

/**
 * GET /api/leave-requests/draft
 * Get all drafts for the authenticated user
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const service = new LeaveRequestService();
    const drafts = await service.getDrafts(user);

    return successResponse(drafts);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/leave-requests/draft
 * Create a new draft
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = SaveDraftDto.parse(body);

    const service = new LeaveRequestService();
    const draft = await service.saveDraft(data, user);

    return successResponse(draft, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

