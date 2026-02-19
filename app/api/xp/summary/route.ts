import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { careerPaths, xpEvents } from "@/db/schema";
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
    const lifetimeXp = careerPath?.lifetimeXp ?? 0;
    const streak = careerPath?.currentStreak ?? 0;
    const consistencyStreak = careerPath?.consistencyStreak ?? 0;

    const { level, levelName } = getLevelFromXp(seasonXp);

    const weekEvents = await db
      .select()
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.employeeId, user.employeeId),
          eq(xpEvents.companyId, user.companyId),
          eq(xpEvents.weekKey, weekKey)
        )
      );

    const weeklyBreakdown: Record<string, number> = {};
    for (const event of weekEvents) {
      weeklyBreakdown[event.category] = (weeklyBreakdown[event.category] ?? 0) + event.xpAwarded;
    }

    return successResponse({
      seasonXp,
      lifetimeXp,
      level,
      levelName,
      weeklyBreakdown,
      streak,
      consistencyStreak,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
