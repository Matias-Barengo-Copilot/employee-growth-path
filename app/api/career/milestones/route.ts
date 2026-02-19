import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { careerPaths, milestones } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { NotFoundError } from "@/lib/utils/errors";

const createMilestoneSchema = z.object({
  phase: z.enum(["foundation", "growing", "leading", "mastering"]),
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  xpReward: z.number().int().min(0).optional().default(50),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = createMilestoneSchema.parse(body);

    const careerPath = await db.query.careerPaths.findFirst({
      where: and(
        eq(careerPaths.employeeId, user.employeeId),
        eq(careerPaths.companyId, user.companyId)
      ),
    });

    if (!careerPath) {
      throw new NotFoundError("Career path not found");
    }

    const existingMilestones = await db
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.careerPathId, careerPath.id),
          eq(milestones.phase, data.phase)
        )
      );

    const position = data.position ?? existingMilestones.length;

    const [milestone] = await db
      .insert(milestones)
      .values({
        careerPathId: careerPath.id,
        phase: data.phase,
        title: data.title,
        description: data.description ?? null,
        status: "locked",
        position,
        xpReward: data.xpReward,
      })
      .returning();

    return successResponse(milestone, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
