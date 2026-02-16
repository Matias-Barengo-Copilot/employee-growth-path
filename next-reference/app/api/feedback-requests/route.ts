import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, or, desc, aliasedTable, count, SQL } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { feedbackRequests, employees, activities } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePaginationParams, buildPaginationMeta, paginationOffset } from "@/lib/utils/pagination";

const createFeedbackRequestSchema = z.object({
  responderId: z.string().uuid(),
  prompt: z.string().optional(),
  deadline: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const direction = searchParams.get('direction');

    const requesters = aliasedTable(employees, "requesters");
    const responders = aliasedTable(employees, "responders");

    const conditions: SQL[] = [eq(feedbackRequests.companyId, user.companyId)];

    if (direction === 'to_me') {
      conditions.push(eq(feedbackRequests.responderId, user.employeeId));
    } else if (direction === 'from_me') {
      conditions.push(eq(feedbackRequests.requesterId, user.employeeId));
    } else {
      conditions.push(
        or(
          eq(feedbackRequests.requesterId, user.employeeId),
          eq(feedbackRequests.responderId, user.employeeId)
        )!
      );
    }

    const whereClause = and(...conditions)!;

    const [totalResult] = await db
      .select({ count: count() })
      .from(feedbackRequests)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const pagination = buildPaginationMeta(total, page, limit);

    const result = await db
      .select({
        id: feedbackRequests.id,
        requesterId: feedbackRequests.requesterId,
        responderId: feedbackRequests.responderId,
        companyId: feedbackRequests.companyId,
        prompt: feedbackRequests.prompt,
        status: feedbackRequests.status,
        deadline: feedbackRequests.deadline,
        createdAt: feedbackRequests.createdAt,
        requesterName: requesters.name,
        responderName: responders.name,
      })
      .from(feedbackRequests)
      .innerJoin(requesters, eq(feedbackRequests.requesterId, requesters.id))
      .innerJoin(responders, eq(feedbackRequests.responderId, responders.id))
      .where(whereClause)
      .orderBy(desc(feedbackRequests.createdAt))
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
    const data = createFeedbackRequestSchema.parse(body);

    const [newRequest] = await db
      .insert(feedbackRequests)
      .values({
        requesterId: user.employeeId,
        responderId: data.responderId,
        companyId: user.companyId,
        prompt: data.prompt ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
      })
      .returning();

    await db.insert(activities).values({
      companyId: user.companyId,
      actorId: user.employeeId,
      type: "feedback_requested",
      targetId: newRequest.id,
      metadata: JSON.stringify({ responderId: data.responderId }),
    });

    return successResponse(newRequest, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
