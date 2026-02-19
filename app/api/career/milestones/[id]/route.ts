import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { careerPaths, milestones } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { NotFoundError, ForbiddenError } from "@/lib/utils/errors";

const updateMilestoneSchema = z.object({
  status: z.enum(["locked", "active", "completed"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();
    const data = updateMilestoneSchema.parse(body);

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

    const updateValues: Record<string, unknown> = {
      status: data.status,
    };

    if (data.status === "completed") {
      updateValues.completedAt = new Date();
    }

    const [updated] = await db
      .update(milestones)
      .set(updateValues)
      .where(eq(milestones.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
