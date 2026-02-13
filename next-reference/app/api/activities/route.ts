import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { activities, employees } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

const createActivitySchema = z.object({
  type: z.enum([
    "snap_sent",
    "goal_created",
    "goal_completed",
    "feedback_given",
    "feedback_requested",
    "profile_updated",
    "member_joined",
  ]),
  targetId: z.string().uuid().nullable().optional(),
  metadata: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await db
      .select({
        id: activities.id,
        companyId: activities.companyId,
        actorId: activities.actorId,
        type: activities.type,
        targetId: activities.targetId,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        actorName: employees.name,
      })
      .from(activities)
      .innerJoin(employees, eq(activities.actorId, employees.id))
      .where(eq(activities.companyId, user.companyId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = createActivitySchema.parse(body);

    const [newActivity] = await db
      .insert(activities)
      .values({
        companyId: user.companyId,
        actorId: user.employeeId,
        type: data.type,
        targetId: data.targetId ?? null,
        metadata: data.metadata ?? null,
      })
      .returning();

    return successResponse(newActivity, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
