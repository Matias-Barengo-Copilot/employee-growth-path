import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, or, desc, aliasedTable } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { feedback, feedbackRequests, employees, activities } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

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

    const senders = aliasedTable(employees, "senders");
    const recipients = aliasedTable(employees, "recipients");

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
      .where(
        and(
          eq(feedback.companyId, user.companyId),
          or(
            eq(feedback.senderId, user.employeeId),
            eq(feedback.recipientId, user.employeeId)
          )
        )
      )
      .orderBy(desc(feedback.createdAt));

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

    return successResponse(result);
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
