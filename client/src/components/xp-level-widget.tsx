import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap, TrendingUp, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface XpSummaryData {
  seasonXp: number;
  lifetimeXp: number;
  level: {
    level: number;
    label: string;
    seasonXp: number;
    progress: number;
    nextLevelXp: number | null;
    xpToNextLevel: number;
  };
  weekly: {
    categories: Record<string, { earned: number; cap: number }>;
    totalWeeklyXp: number;
    bonuses: { variety: number; streak: number };
  };
  season: { quarter: number; year: number };
  consistencyStreak: number;
}

const LEVEL_COLORS: Record<number, string> = {
  1: "text-muted-foreground",
  2: "text-blue-500",
  3: "text-emerald-500",
  4: "text-amber-500",
  5: "text-purple-500",
};

const LEVEL_BG: Record<number, string> = {
  1: "bg-muted",
  2: "bg-blue-500/10",
  3: "bg-emerald-500/10",
  4: "bg-amber-500/10",
  5: "bg-purple-500/10",
};

export function XpLevelWidget() {
  const { data } = useQuery<XpSummaryData>({
    queryKey: ["/api/xp/summary"],
  });

  if (!data) return null;

  const { level, weekly, seasonXp, lifetimeXp, consistencyStreak } = data;

  return (
    <Link href="/career">
      <Card className="hover-elevate cursor-pointer" data-testid="widget-xp-level">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center justify-center h-12 w-12 rounded-full ${LEVEL_BG[level.level]}`}>
              <svg className="absolute inset-0" viewBox="0 0 48 48">
                <circle
                  cx="24" cy="24" r="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted/30"
                />
                <circle
                  cx="24" cy="24" r="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={`${(level.progress / 100) * 131.95} 131.95`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                  className={LEVEL_COLORS[level.level]}
                />
              </svg>
              <span className={`text-sm font-bold ${LEVEL_COLORS[level.level]}`} data-testid="text-xp-level">
                {level.level}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold text-sm" data-testid="text-season-xp">{seasonXp} XP</span>
                <span className="text-xs text-muted-foreground">this season</span>
              </div>
              <p className={`text-xs font-medium ${LEVEL_COLORS[level.level]}`}>
                Level {level.level} - {level.label}
              </p>
              {level.nextLevelXp && (
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={level.progress} className="h-1 flex-1" />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {level.xpToNextLevel} to L{level.level + 1}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" data-testid="text-weekly-xp">+{weekly.totalWeeklyXp} this week</span>
              </div>
              {consistencyStreak > 0 && (
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="text-xs text-muted-foreground">{consistencyStreak}w streak</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function XpWeeklyBreakdown() {
  const { data } = useQuery<XpSummaryData>({
    queryKey: ["/api/xp/summary"],
  });

  if (!data) return null;

  const { weekly } = data;
  const categories = [
    { key: "recognition", label: "Recognition", color: "bg-amber-500" },
    { key: "feedback", label: "Feedback", color: "bg-purple-500" },
    { key: "goals", label: "Goals", color: "bg-green-500" },
    { key: "learning", label: "Learning", color: "bg-blue-500" },
  ];

  return (
    <div className="space-y-3" data-testid="xp-weekly-breakdown">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly XP Progress</h3>
        <span className="text-xs text-muted-foreground">
          {weekly.totalWeeklyXp} XP earned
        </span>
      </div>
      {categories.map(({ key, label, color }) => {
        const cat = weekly.categories[key];
        if (!cat) return null;
        const pct = cat.cap > 0 ? Math.min(100, (cat.earned / cat.cap) * 100) : 0;
        return (
          <div key={key} data-testid={`xp-category-${key}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">
                {cat.earned}/{cat.cap}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {(weekly.bonuses.variety > 0 || weekly.bonuses.streak > 0) && (
        <div className="flex gap-2 flex-wrap pt-1">
          {weekly.bonuses.variety > 0 && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              Variety +{weekly.bonuses.variety}
            </span>
          )}
          {weekly.bonuses.streak > 0 && (
            <span className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
              Streak +{weekly.bonuses.streak}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
