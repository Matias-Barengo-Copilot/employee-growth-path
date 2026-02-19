import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { journalEntries } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

const createJournalSchema = z.object({
  milestoneId: z.string().uuid().nullable().optional(),
  whatLearned: z.string().nullable().optional(),
  whatAccomplished: z.string().nullable().optional(),
  whatsNext: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.employeeId, user.employeeId),
          eq(journalEntries.companyId, user.companyId)
        )
      )
      .orderBy(desc(journalEntries.createdAt));

    return successResponse(entries);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = createJournalSchema.parse(body);

    const [entry] = await db
      .insert(journalEntries)
      .values({
        employeeId: user.employeeId,
        companyId: user.companyId,
        milestoneId: data.milestoneId ?? null,
        whatLearned: data.whatLearned ?? null,
        whatAccomplished: data.whatAccomplished ?? null,
        whatsNext: data.whatsNext ?? null,
      })
      .returning();

    return successResponse(entry, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
