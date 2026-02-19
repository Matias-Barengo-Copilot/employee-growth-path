import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, or, desc, aliasedTable, count, SQL } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { feedback, feedbackRequests, employees, activities } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePaginationParams, buildPaginationMeta, paginationOffset } from "@/lib/utils/pagination";

const createFeedbackSchema = z.object({
  recipientId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  keepDoing: z.string().optional(),
  considerImproving: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const direction = searchParams.get('direction');

    const senders = aliasedTable(employees, "senders");
    const recipients = aliasedTable(employees, "recipients");

    const conditions: SQL[] = [eq(feedback.companyId, user.companyId)];

    if (direction === 'received') {
      conditions.push(eq(feedback.recipientId, user.employeeId));
    } else if (direction === 'given') {
      conditions.push(eq(feedback.senderId, user.employeeId));
    } else {
      conditions.push(
        or(
          eq(feedback.senderId, user.employeeId),
          eq(feedback.recipientId, user.employeeId)
        )!
      );
    }

    const whereClause = and(...conditions)!;

    const [totalResult] = await db
      .select({ count: count() })
      .from(feedback)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const pagination = buildPaginationMeta(total, page, limit);

    const rows = await db
      .select({
        id: feedback.id,
        senderId: feedback.senderId,
        recipientId: feedback.recipientId,
        companyId: feedback.companyId,
        requestId: feedback.requestId,
        keepDoing: feedback.keepDoing,
        considerImproving: feedback.considerImproving,
        tags: feedback.tags,
        isAnonymous: feedback.isAnonymous,
        isRead: feedback.isRead,
        createdAt: feedback.createdAt,
        senderName: senders.name,
        recipientName: recipients.name,
      })
      .from(feedback)
      .innerJoin(senders, eq(feedback.senderId, senders.id))
      .innerJoin(recipients, eq(feedback.recipientId, recipients.id))
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(paginationOffset(pagination.page, limit));

    const result = rows.map((row) => {
      if (row.isAnonymous && row.recipientId === user.employeeId && row.senderId !== user.employeeId) {
        return {
          ...row,
          senderId: null,
          senderName: null,
        };
      }
      return row;
    });

    return successResponse({ data: result, pagination });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = createFeedbackSchema.parse(body);

    const [newFeedback] = await db
      .insert(feedback)
      .values({
        senderId: user.employeeId,
        recipientId: data.recipientId,
        companyId: user.companyId,
        requestId: data.requestId ?? null,
        keepDoing: data.keepDoing ?? null,
        considerImproving: data.considerImproving ?? null,
        tags: data.tags ?? null,
        isAnonymous: data.isAnonymous,
      })
      .returning();

    if (data.requestId) {
      await db
        .update(feedbackRequests)
        .set({ status: "completed" })
        .where(
          and(
            eq(feedbackRequests.id, data.requestId),
            eq(feedbackRequests.companyId, user.companyId)
          )
        );
    }

    await db.insert(activities).values({
      companyId: user.companyId,
      actorId: user.employeeId,
      type: "feedback_given",
      targetId: newFeedback.id,
      metadata: JSON.stringify({ recipientId: data.recipientId, isAnonymous: data.isAnonymous }),
    });

    return successResponse(newFeedback, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
