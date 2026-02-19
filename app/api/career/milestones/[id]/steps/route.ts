import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { milestones, milestoneSteps } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { NotFoundError, ForbiddenError } from "@/lib/utils/errors";

const createStepSchema = z.object({
  title: z.string().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();
    const data = createStepSchema.parse(body);

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

    const [step] = await db
      .insert(milestoneSteps)
      .values({
        milestoneId: id,
        title: data.title,
      })
      .returning();

    return successResponse(step, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
