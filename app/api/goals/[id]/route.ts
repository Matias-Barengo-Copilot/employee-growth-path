import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { goals, employees } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { NotFoundError, ForbiddenError } from "@/lib/utils/errors";

const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  category: z.enum(["growth", "delivery", "leadership", "learning"]).optional(),
  status: z.enum(["not_started", "on_track", "at_risk", "completed"]).optional(),
  visibility: z.enum(["private", "manager", "team"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  quarter: z.string().max(10).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    const [goal] = await db
      .select({
        id: goals.id,
        employeeId: goals.employeeId,
        companyId: goals.companyId,
        title: goals.title,
        description: goals.description,
        category: goals.category,
        status: goals.status,
        visibility: goals.visibility,
        progress: goals.progress,
        quarter: goals.quarter,
        dueDate: goals.dueDate,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
        employeeName: employees.name,
      })
      .from(goals)
      .innerJoin(employees, eq(goals.employeeId, employees.id))
      .where(
        and(
          eq(goals.id, id),
          eq(goals.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!goal) {
      throw new NotFoundError("Goal not found");
    }

    return successResponse(goal);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();
    const data = updateGoalSchema.parse(body);

    const [existing] = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.id, id),
          eq(goals.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Goal not found");
    }

    if (existing.employeeId !== user.employeeId) {
      throw new ForbiddenError("You can only update your own goals");
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.quarter !== undefined) updateData.quarter = data.quarter;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const [updated] = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.id, id),
          eq(goals.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Goal not found");
    }

    if (existing.employeeId !== user.employeeId) {
      throw new ForbiddenError("You can only delete your own goals");
    }

    await db.delete(goals).where(eq(goals.id, id));

    return successResponse({ message: "Goal deleted successfully" });
  } catch (error) {
    return errorResponse(error);
  }
}
