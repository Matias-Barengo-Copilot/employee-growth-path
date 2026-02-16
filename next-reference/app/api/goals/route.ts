import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { goals, employees, activities } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePaginationParams, buildPaginationMeta, paginationOffset } from "@/lib/utils/pagination";

const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  category: z.enum(["growth", "delivery", "leadership", "learning"]),
  status: z.enum(["not_started", "on_track", "at_risk", "completed"]).optional().default("not_started"),
  visibility: z.enum(["private", "manager", "team"]).optional().default("private"),
  progress: z.number().int().min(0).max(100).optional().default(0),
  quarter: z.string().max(10).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const category = searchParams.get('category');

    const conditions = [
      eq(goals.employeeId, user.employeeId),
      eq(goals.companyId, user.companyId),
    ];

    if (category && ['growth', 'delivery', 'leadership', 'learning'].includes(category)) {
      conditions.push(eq(goals.category, category as 'growth' | 'delivery' | 'leadership' | 'learning'));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: count() })
      .from(goals)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const pagination = buildPaginationMeta(total, page, limit);

    const result = await db
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
      .where(whereClause)
      .orderBy(goals.createdAt)
      .limit(limit)
      .offset(paginationOffset(pagination.page, limit));

    return successResponse({ data: result, pagination });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = createGoalSchema.parse(body);

    const [newGoal] = await db
      .insert(goals)
      .values({
        employeeId: user.employeeId,
        companyId: user.companyId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        status: data.status,
        visibility: data.visibility,
        progress: data.progress,
        quarter: data.quarter ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      })
      .returning();

    await db.insert(activities).values({
      companyId: user.companyId,
      actorId: user.employeeId,
      type: "goal_created",
      targetId: newGoal.id,
      metadata: JSON.stringify({ title: newGoal.title, category: newGoal.category }),
    });

    return successResponse(newGoal, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
