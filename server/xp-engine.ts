import { storage } from "./storage";
import type { Employee, CareerPath } from "@shared/schema";

type XpCategory =
  | "snap_give" | "snap_receive"
  | "feedback_give" | "feedback_request" | "feedback_helpful"
  | "goal_create" | "goal_update" | "goal_complete"
  | "milestone_complete" | "milestone_step"
  | "journal" | "skill_assessment"
  | "variety_bonus" | "streak_bonus";

interface XpConfig {
  baseXp: number;
  weeklyCap: number;
  perRecipientCap?: number;
  minContentLength?: number;
}

const XP_CONFIGS: Record<XpCategory, XpConfig> = {
  snap_give:         { baseXp: 1,  weeklyCap: 10, perRecipientCap: 2 },
  snap_receive:      { baseXp: 1,  weeklyCap: 5 },
  feedback_give:     { baseXp: 3,  weeklyCap: 12, minContentLength: 20 },
  feedback_request:  { baseXp: 2,  weeklyCap: 4 },
  feedback_helpful:  { baseXp: 2,  weeklyCap: 6 },
  goal_create:       { baseXp: 3,  weeklyCap: 6 },
  goal_update:       { baseXp: 2,  weeklyCap: 8 },
  goal_complete:     { baseXp: 8,  weeklyCap: 16 },
  milestone_complete:{ baseXp: 10, weeklyCap: 30 },
  milestone_step:    { baseXp: 3,  weeklyCap: 15 },
  journal:           { baseXp: 5,  weeklyCap: 15 },
  skill_assessment:  { baseXp: 5,  weeklyCap: 10 },
  variety_bonus:     { baseXp: 3,  weeklyCap: 3 },
  streak_bonus:      { baseXp: 2,  weeklyCap: 2 },
};

const SEASON_LEVELS = [
  { level: 1, minXp: 0,   maxXp: 24,  label: "Starter" },
  { level: 2, minXp: 25,  maxXp: 59,  label: "Contributor" },
  { level: 3, minXp: 60,  maxXp: 99,  label: "Engaged" },
  { level: 4, minXp: 100, maxXp: 149, label: "Champion" },
  { level: 5, minXp: 150, maxXp: Infinity, label: "All-Star" },
];

export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return `${monday.getFullYear()}-W${String(Math.ceil((monday.getTime() - new Date(monday.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1).padStart(2, '0')}`;
}

export function getCurrentSeason(date: Date = new Date()): { quarter: number; year: number } {
  return {
    quarter: Math.ceil((date.getMonth() + 1) / 3),
    year: date.getFullYear(),
  };
}

export function getSeasonLevel(seasonXp: number) {
  const level = SEASON_LEVELS.find(l => seasonXp >= l.minXp && seasonXp <= l.maxXp) || SEASON_LEVELS[0];
  const nextLevel = SEASON_LEVELS.find(l => l.level === level.level + 1);
  const progress = nextLevel
    ? ((seasonXp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100
    : 100;
  return {
    level: level.level,
    label: level.label,
    seasonXp,
    progress: Math.min(100, Math.max(0, progress)),
    nextLevelXp: nextLevel?.minXp ?? null,
    xpToNextLevel: nextLevel ? nextLevel.minXp - seasonXp : 0,
  };
}

export interface AwardXpResult {
  xpAwarded: number;
  category: XpCategory;
  capped: boolean;
  seasonXp: number;
  lifetimeXp: number;
  level: ReturnType<typeof getSeasonLevel>;
}

interface AwardXpOptions {
  employee: Employee;
  category: XpCategory;
  recipientId?: string;
  targetId?: string;
  contentLength?: number;
  customXp?: number;
}

export async function awardXp(options: AwardXpOptions): Promise<AwardXpResult> {
  const { employee, category, recipientId, targetId, contentLength } = options;
  const config = XP_CONFIGS[category];
  const weekKey = getWeekKey();
  const season = getCurrentSeason();

  const weeklyEvents = await storage.getXpEventsByEmployeeWeekAndCategory(
    employee.id, weekKey, category
  );
  const weeklyTotal = weeklyEvents.reduce((sum, e) => sum + e.xpAwarded, 0);

  if (weeklyTotal >= config.weeklyCap) {
    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath) {
      careerPath = await storage.createCareerPath({
        employeeId: employee.id,
        companyId: employee.companyId,
      });
    }
    return {
      xpAwarded: 0,
      category,
      capped: true,
      seasonXp: careerPath.seasonXp,
      lifetimeXp: careerPath.lifetimeXp,
      level: getSeasonLevel(careerPath.seasonXp),
    };
  }

  if (config.perRecipientCap && recipientId) {
    const recipientEvents = await storage.getXpEventsByEmployeeWeekCategoryAndRecipient(
      employee.id, weekKey, category, recipientId
    );
    const recipientTotal = recipientEvents.reduce((sum, e) => sum + e.xpAwarded, 0);
    if (recipientTotal >= config.perRecipientCap) {
      let careerPath = await storage.getCareerPathByEmployee(employee.id);
      if (!careerPath) {
        careerPath = await storage.createCareerPath({
          employeeId: employee.id,
          companyId: employee.companyId,
        });
      }
      return {
        xpAwarded: 0,
        category,
        capped: true,
        seasonXp: careerPath.seasonXp,
        lifetimeXp: careerPath.lifetimeXp,
        level: getSeasonLevel(careerPath.seasonXp),
      };
    }
  }

  if (config.minContentLength && contentLength !== undefined && contentLength < config.minContentLength) {
    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath) {
      careerPath = await storage.createCareerPath({
        employeeId: employee.id,
        companyId: employee.companyId,
      });
    }
    return {
      xpAwarded: 0,
      category,
      capped: false,
      seasonXp: careerPath.seasonXp,
      lifetimeXp: careerPath.lifetimeXp,
      level: getSeasonLevel(careerPath.seasonXp),
    };
  }

  const baseXp = options.customXp ?? config.baseXp;
  const remaining = config.weeklyCap - weeklyTotal;
  const xpToAward = Math.min(baseXp, remaining);

  if (xpToAward <= 0) {
    let careerPath = await storage.getCareerPathByEmployee(employee.id);
    if (!careerPath) {
      careerPath = await storage.createCareerPath({
        employeeId: employee.id,
        companyId: employee.companyId,
      });
    }
    return {
      xpAwarded: 0,
      category,
      capped: true,
      seasonXp: careerPath.seasonXp,
      lifetimeXp: careerPath.lifetimeXp,
      level: getSeasonLevel(careerPath.seasonXp),
    };
  }

  await storage.createXpEvent({
    employeeId: employee.id,
    companyId: employee.companyId,
    category,
    xpAwarded: xpToAward,
    recipientId: recipientId || null,
    targetId: targetId || null,
    seasonQuarter: season.quarter,
    seasonYear: season.year,
    weekKey,
  });

  let careerPath = await storage.getCareerPathByEmployee(employee.id);
  if (!careerPath) {
    careerPath = await storage.createCareerPath({
      employeeId: employee.id,
      companyId: employee.companyId,
      seasonQuarter: season.quarter,
      seasonYear: season.year,
    });
  }

  const maybeResetSeason = (careerPath.seasonQuarter !== season.quarter || careerPath.seasonYear !== season.year);
  const newSeasonXp = (maybeResetSeason ? 0 : careerPath.seasonXp) + xpToAward;
  const newLifetimeXp = careerPath.lifetimeXp + xpToAward;
  const newXp = careerPath.xp + xpToAward;

  await storage.updateCareerPath(careerPath.id, {
    xp: newXp,
    seasonXp: newSeasonXp,
    lifetimeXp: newLifetimeXp,
    seasonQuarter: season.quarter,
    seasonYear: season.year,
    currentPhase: getPhaseForXp(newXp),
  });

  return {
    xpAwarded: xpToAward,
    category,
    capped: false,
    seasonXp: newSeasonXp,
    lifetimeXp: newLifetimeXp,
    level: getSeasonLevel(newSeasonXp),
  };
}

export async function checkAndAwardVarietyBonus(employee: Employee): Promise<AwardXpResult | null> {
  const weekKey = getWeekKey();
  const weekEvents = await storage.getXpEventsByEmployeeAndWeek(employee.id, weekKey);

  const existingVariety = weekEvents.find(e => e.category === "variety_bonus");
  if (existingVariety) return null;

  const coreCategories = new Set<string>();
  const recognitionCats = ["snap_give", "snap_receive"];
  const feedbackCats = ["feedback_give", "feedback_request", "feedback_helpful"];
  const goalCats = ["goal_create", "goal_update", "goal_complete"];
  const learningCats = ["milestone_complete", "milestone_step", "journal", "skill_assessment"];

  for (const event of weekEvents) {
    if (recognitionCats.includes(event.category)) coreCategories.add("recognition");
    if (feedbackCats.includes(event.category)) coreCategories.add("feedback");
    if (goalCats.includes(event.category)) coreCategories.add("goals");
    if (learningCats.includes(event.category)) coreCategories.add("learning");
  }

  if (coreCategories.size >= 3) {
    return awardXp({ employee, category: "variety_bonus" });
  }
  return null;
}

export async function checkAndAwardStreakBonus(employee: Employee): Promise<AwardXpResult | null> {
  const weekKey = getWeekKey();
  const weekEvents = await storage.getXpEventsByEmployeeAndWeek(employee.id, weekKey);

  const existingStreak = weekEvents.find(e => e.category === "streak_bonus");
  if (existingStreak) return null;

  const nonBonusEvents = weekEvents.filter(e => e.category !== "variety_bonus" && e.category !== "streak_bonus");
  if (nonBonusEvents.length < 2) return null;

  let careerPath = await storage.getCareerPathByEmployee(employee.id);
  if (!careerPath) return null;

  if (careerPath.lastActiveWeek && careerPath.lastActiveWeek !== weekKey) {
    const lastWeekEvents = await storage.getXpEventsByEmployeeAndWeek(employee.id, careerPath.lastActiveWeek);
    const lastNonBonus = lastWeekEvents.filter(e => e.category !== "variety_bonus" && e.category !== "streak_bonus");
    if (lastNonBonus.length >= 2) {
      const newStreak = careerPath.consistencyStreak + 1;
      await storage.updateCareerPath(careerPath.id, {
        lastActiveWeek: weekKey,
        consistencyStreak: newStreak,
      });
      if (newStreak >= 2) {
        return awardXp({ employee, category: "streak_bonus" });
      }
    } else {
      await storage.updateCareerPath(careerPath.id, {
        lastActiveWeek: weekKey,
        consistencyStreak: 1,
      });
    }
  } else if (!careerPath.lastActiveWeek) {
    await storage.updateCareerPath(careerPath.id, {
      lastActiveWeek: weekKey,
      consistencyStreak: 1,
    });
  }

  return null;
}

export async function getWeeklyXpSummary(employeeId: string) {
  const weekKey = getWeekKey();
  const events = await storage.getXpEventsByEmployeeAndWeek(employeeId, weekKey);

  const categorySummary: Record<string, { earned: number; cap: number }> = {};
  for (const [cat, config] of Object.entries(XP_CONFIGS)) {
    if (cat === "variety_bonus" || cat === "streak_bonus") continue;
    const catEvents = events.filter(e => e.category === cat);
    categorySummary[cat] = {
      earned: catEvents.reduce((sum, e) => sum + e.xpAwarded, 0),
      cap: config.weeklyCap,
    };
  }

  const grouped: Record<string, { earned: number; cap: number }> = {
    recognition: {
      earned: (categorySummary.snap_give?.earned || 0) + (categorySummary.snap_receive?.earned || 0),
      cap: (categorySummary.snap_give?.cap || 0) + (categorySummary.snap_receive?.cap || 0),
    },
    feedback: {
      earned: (categorySummary.feedback_give?.earned || 0) + (categorySummary.feedback_request?.earned || 0) + (categorySummary.feedback_helpful?.earned || 0),
      cap: (categorySummary.feedback_give?.cap || 0) + (categorySummary.feedback_request?.cap || 0) + (categorySummary.feedback_helpful?.cap || 0),
    },
    goals: {
      earned: (categorySummary.goal_create?.earned || 0) + (categorySummary.goal_update?.earned || 0) + (categorySummary.goal_complete?.earned || 0),
      cap: (categorySummary.goal_create?.cap || 0) + (categorySummary.goal_update?.cap || 0) + (categorySummary.goal_complete?.cap || 0),
    },
    learning: {
      earned: (categorySummary.milestone_complete?.earned || 0) + (categorySummary.milestone_step?.earned || 0) + (categorySummary.journal?.earned || 0) + (categorySummary.skill_assessment?.earned || 0),
      cap: (categorySummary.milestone_complete?.cap || 0) + (categorySummary.milestone_step?.cap || 0) + (categorySummary.journal?.cap || 0) + (categorySummary.skill_assessment?.cap || 0),
    },
  };

  const totalWeeklyXp = events.reduce((sum, e) => sum + e.xpAwarded, 0);
  const bonuses = {
    variety: events.filter(e => e.category === "variety_bonus").reduce((s, e) => s + e.xpAwarded, 0),
    streak: events.filter(e => e.category === "streak_bonus").reduce((s, e) => s + e.xpAwarded, 0),
  };

  return { categories: grouped, details: categorySummary, totalWeeklyXp, bonuses, weekKey };
}

function getPhaseForXp(xp: number): "foundation" | "growing" | "leading" | "mastering" {
  if (xp >= 1000) return "mastering";
  if (xp >= 500) return "leading";
  if (xp >= 200) return "growing";
  return "foundation";
}

export { XP_CONFIGS, SEASON_LEVELS };
