import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc, aliasedTable } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { snaps, employees, activities } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

const createSnapSchema = z.object({
  recipientId: z.string().uuid(),
  message: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const senders = aliasedTable(employees, "senders");
    const recipients = aliasedTable(employees, "recipients");

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
      .where(eq(snaps.companyId, user.companyId))
      .orderBy(desc(snaps.createdAt));

    return successResponse(result);
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
