import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { skillAssessments } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

const createSkillAssessmentSchema = z.object({
  dimensions: z.array(
    z.object({
      name: z.string().min(1),
      score: z.number().min(0).max(10),
    })
  ).min(1),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const assessments = await db
      .select()
      .from(skillAssessments)
      .where(
        and(
          eq(skillAssessments.employeeId, user.employeeId),
          eq(skillAssessments.companyId, user.companyId)
        )
      )
      .orderBy(desc(skillAssessments.createdAt));

    return successResponse(assessments);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const data = createSkillAssessmentSchema.parse(body);

    const [assessment] = await db
      .insert(skillAssessments)
      .values({
        employeeId: user.employeeId,
        companyId: user.companyId,
        dimensions: data.dimensions,
      })
      .returning();

    return successResponse(assessment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
