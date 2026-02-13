import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { feedback } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    const [updated] = await db
      .update(feedback)
      .set({ isRead: true })
      .where(
        and(
          eq(feedback.id, id),
          eq(feedback.recipientId, user.employeeId),
          eq(feedback.companyId, user.companyId)
        )
      )
      .returning();

    if (!updated) {
      return errorResponse(new Error("Feedback not found"));
    }

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
