import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { milestones, milestoneSteps } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { NotFoundError, ForbiddenError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id, stepId } = await params;

    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, id),
      with: {
        careerPath: true,
      },
    });

    if (!milestone) {
      throw new NotFoundError("Milestone not found");
    }

    if (milestone.careerPath.employeeId !== user.employeeId) {
      throw new ForbiddenError("You can only modify your own milestones");
    }

    const step = await db.query.milestoneSteps.findFirst({
      where: eq(milestoneSteps.id, stepId),
    });

    if (!step) {
      throw new NotFoundError("Step not found");
    }

    const newCompleted = !step.isCompleted;

    const [updated] = await db
      .update(milestoneSteps)
      .set({
        isCompleted: newCompleted,
        completedAt: newCompleted ? new Date() : null,
      })
      .where(eq(milestoneSteps.id, stepId))
      .returning();

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
