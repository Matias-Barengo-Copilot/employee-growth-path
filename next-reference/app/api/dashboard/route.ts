import { eq, and, desc, sql, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import {
  goals,
  snaps,
  feedbackRequests,
  activities,
  careerPaths,
  employees,
} from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

function getLevelFromXp(seasonXp: number): { level: number; levelName: string } {
  if (seasonXp >= 150) return { level: 5, levelName: "All-Star" };
  if (seasonXp >= 100) return { level: 4, levelName: "Champion" };
  if (seasonXp >= 60) return { level: 3, levelName: "Engaged" };
  if (seasonXp >= 25) return { level: 2, levelName: "Contributor" };
  return { level: 1, levelName: "Starter" };
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${String(Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;

    const recentGoals = await db
      .select({
        id: goals.id,
        title: goals.title,
        status: goals.status,
        category: goals.category,
        progress: goals.progress,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(
        and(
          eq(goals.employeeId, user.employeeId),
          eq(goals.companyId, user.companyId)
        )
      )
      .orderBy(desc(goals.createdAt))
      .limit(5);

    const recentSnaps = await db
      .select({
        id: snaps.id,
        senderId: snaps.senderId,
        message: snaps.message,
        tags: snaps.tags,
        createdAt: snaps.createdAt,
        senderName: employees.name,
      })
      .from(snaps)
      .innerJoin(employees, eq(snaps.senderId, employees.id))
      .where(
        and(
          eq(snaps.recipientId, user.employeeId),
          eq(snaps.companyId, user.companyId)
        )
      )
      .orderBy(desc(snaps.createdAt))
      .limit(5);

    const pendingFeedbackRequests = await db
      .select({
        id: feedbackRequests.id,
        requesterId: feedbackRequests.requesterId,
        prompt: feedbackRequests.prompt,
        deadline: feedbackRequests.deadline,
        createdAt: feedbackRequests.createdAt,
        requesterName: employees.name,
      })
      .from(feedbackRequests)
      .innerJoin(employees, eq(feedbackRequests.requesterId, employees.id))
      .where(
        and(
          eq(feedbackRequests.responderId, user.employeeId),
          eq(feedbackRequests.companyId, user.companyId),
          eq(feedbackRequests.status, "pending")
        )
      )
      .orderBy(desc(feedbackRequests.createdAt));

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [activityCountResult] = await db
      .select({ count: count() })
      .from(activities)
      .where(
        and(
          eq(activities.companyId, user.companyId),
          eq(activities.actorId, user.employeeId),
          sql`${activities.createdAt} >= ${startOfWeek.toISOString()}`
        )
      );

    const [careerPath] = await db
      .select()
      .from(careerPaths)
      .where(
        and(
          eq(careerPaths.employeeId, user.employeeId),
          eq(careerPaths.companyId, user.companyId)
        )
      )
      .limit(1);

    const seasonXp = careerPath?.seasonXp ?? 0;
    const { level, levelName } = getLevelFromXp(seasonXp);

    return successResponse({
      recentGoals,
      recentSnaps,
      pendingFeedbackRequests,
      activityCount: activityCountResult?.count ?? 0,
      xpSummary: {
        seasonXp,
        level,
        levelName,
        streak: careerPath?.currentStreak ?? 0,
        consistencyStreak: careerPath?.consistencyStreak ?? 0,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
