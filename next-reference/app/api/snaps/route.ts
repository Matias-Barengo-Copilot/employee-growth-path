import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc, aliasedTable, and, or, count, SQL } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { snaps, employees, activities } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePaginationParams, buildPaginationMeta, paginationOffset } from "@/lib/utils/pagination";

const createSnapSchema = z.object({
  recipientId: z.string().uuid(),
  message: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const direction = searchParams.get('direction');

    const senders = aliasedTable(employees, "senders");
    const recipients = aliasedTable(employees, "recipients");

    const conditions: SQL[] = [eq(snaps.companyId, user.companyId)];

    if (direction === 'received') {
      conditions.push(eq(snaps.recipientId, user.employeeId));
    } else if (direction === 'sent') {
      conditions.push(eq(snaps.senderId, user.employeeId));
    } else {
      conditions.push(
        or(
          eq(snaps.senderId, user.employeeId),
          eq(snaps.recipientId, user.employeeId)
        )!
      );
    }

    const whereClause = and(...conditions)!;

    const [totalResult] = await db
      .select({ count: count() })
      .from(snaps)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const pagination = buildPaginationMeta(total, page, limit);

    const result = await db
      .select({
        id: snaps.id,
        senderId: snaps.senderId,
        recipientId: snaps.recipientId,
        companyId: snaps.companyId,
        message: snaps.message,
        tags: snaps.tags,
        createdAt: snaps.createdAt,
        senderName: senders.name,
        recipientName: recipients.name,
      })
      .from(snaps)
      .innerJoin(senders, eq(snaps.senderId, senders.id))
      .innerJoin(recipients, eq(snaps.recipientId, recipients.id))
      .where(whereClause)
      .orderBy(desc(snaps.createdAt))
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
    const data = createSnapSchema.parse(body);

    const [newSnap] = await db
      .insert(snaps)
      .values({
        senderId: user.employeeId,
        recipientId: data.recipientId,
        companyId: user.companyId,
        message: data.message,
        tags: data.tags ?? null,
      })
      .returning();

    await db.insert(activities).values({
      companyId: user.companyId,
      actorId: user.employeeId,
      type: "snap_sent",
      targetId: newSnap.id,
      metadata: JSON.stringify({ recipientId: data.recipientId }),
    });

    return successResponse(newSnap, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
