import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Flag,
  Map,
  Mountain,
  BookOpen,
  Flame,
  Crown,
  CheckCheck,
  Radar,
  TrendingUp,
  Plus,
  Trophy,
  Zap,
  ChevronRight,
  Star,
  Lock,
  Check,
  Circle,
  PenLine,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { MilestoneDetailDialog } from "@/components/dialogs/milestone-detail-dialog";
import { CreateMilestoneDialog } from "@/components/dialogs/create-milestone-dialog";
import { JournalDialog } from "@/components/dialogs/journal-dialog";
import { SkillAssessmentDialog } from "@/components/dialogs/skill-assessment-dialog";
import { SkillRadarChart } from "@/components/skill-radar-chart";
import { XpWeeklyBreakdown } from "@/components/xp-level-widget";
import type { Milestone, MilestoneStep, JournalEntry, SkillAssessment, CareerPath } from "@shared/schema";

interface MilestoneWithSteps extends Milestone {
  steps: MilestoneStep[];
}

interface CareerBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface CareerData {
  careerPath: CareerPath;
  milestones: MilestoneWithSteps[];
  journalEntries: JournalEntry[];
  skillAssessments: SkillAssessment[];
  badges: CareerBadge[];
  stats: {
    totalMilestones: number;
    completedMilestones: number;
    totalSteps: number;
    completedSteps: number;
    journalCount: number;
    assessmentCount: number;
  };
}

const PHASE_CONFIG = {
  foundation: { label: "Foundation", color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400", xpRange: "0 - 200 XP", icon: Circle },
  growing: { label: "Growing", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", xpRange: "200 - 500 XP", icon: TrendingUp },
  leading: { label: "Leading", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", xpRange: "500 - 1000 XP", icon: Star },
  mastering: { label: "Mastering", color: "bg-purple-500", textColor: "text-purple-600 dark:text-purple-400", xpRange: "1000+ XP", icon: Crown },
} as const;

const BADGE_ICONS: Record<string, typeof Flag> = {
  flag: Flag,
  map: Map,
  mountain: Mountain,
  "book-open": BookOpen,
  flame: Flame,
  crown: Crown,
  "check-check": CheckCheck,
  radar: Radar,
  "trending-up": TrendingUp,
};

function getXpProgress(xp: number): { phase: string; progress: number; nextThreshold: number } {
  if (xp >= 1000) return { phase: "mastering", progress: 100, nextThreshold: 1000 };
  if (xp >= 500) return { phase: "leading", progress: ((xp - 500) / 500) * 100, nextThreshold: 1000 };
  if (xp >= 200) return { phase: "growing", progress: ((xp - 200) / 300) * 100, nextThreshold: 500 };
  return { phase: "foundation", progress: (xp / 200) * 100, nextThreshold: 200 };
}

export default function Career() {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [createPhase, setCreatePhase] = useState<string>("foundation");
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isSkillOpen, setIsSkillOpen] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<CareerData>({
    queryKey: ["/api/career"],
  });

  const xpInfo = data ? getXpProgress(data.careerPath.xp) : { phase: "foundation", progress: 0, nextThreshold: 200 };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Career Growth" description="Your professional journey" />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedMilestone = selectedMilestoneId ? data.milestones.find(m => m.id === selectedMilestoneId) || null : null;
  const phases = ["foundation", "growing", "leading", "mastering"] as const;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Career Growth" description="Your professional journey" />
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        <div className="p-4 lg:p-6 space-y-6">

          <Card className="p-4 lg:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-lg" data-testid="text-xp-total">{data.careerPath.xp} XP</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Phase: <span className={cn("font-medium", PHASE_CONFIG[data.careerPath.currentPhase as keyof typeof PHASE_CONFIG]?.textColor)}>
                    {PHASE_CONFIG[data.careerPath.currentPhase as keyof typeof PHASE_CONFIG]?.label}
                  </span>
                  {xpInfo.phase !== "mastering" && (
                    <span className="ml-2">({xpInfo.nextThreshold - data.careerPath.xp} XP to next phase)</span>
                  )}
                </p>
                <Progress value={xpInfo.progress} className="h-2" data-testid="progress-xp" />
              </div>
              <div className="flex items-center gap-4 text-center">
                <div>
                  <div className="flex items-center gap-1 justify-center">
                    <Flame className={cn("h-4 w-4", data.careerPath.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
                    <span className="font-semibold" data-testid="text-streak">{data.careerPath.currentStreak}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 justify-center">
                    <Trophy className={cn("h-4 w-4", data.badges.filter(b => b.earned).length > 0 ? "text-amber-500" : "text-muted-foreground")} />
                    <span className="font-semibold" data-testid="text-badge-count">
                      {data.badges.filter(b => b.earned).length}/{data.badges.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Badges</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-6">
            <XpWeeklyBreakdown />
          </Card>

          <Tabs defaultValue="map" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="map" data-testid="tab-map">
                <Map className="h-4 w-4 mr-1 hidden sm:block" />
                Map
              </TabsTrigger>
              <TabsTrigger value="journal" data-testid="tab-journal">
                <BookOpen className="h-4 w-4 mr-1 hidden sm:block" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="skills" data-testid="tab-skills">
                <Radar className="h-4 w-4 mr-1 hidden sm:block" />
                Skills
              </TabsTrigger>
              <TabsTrigger value="badges" data-testid="tab-badges">
                <Trophy className="h-4 w-4 mr-1 hidden sm:block" />
                Badges
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="mt-4 space-y-6">
              {phases.map((phase) => {
                const config = PHASE_CONFIG[phase];
                const phaseMilestones = data.milestones.filter(m => m.phase === phase);
                const PhaseIcon = config.icon;
                const isCurrentPhase = data.careerPath.currentPhase === phase;

                return (
                  <div key={phase} className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("flex items-center justify-center h-8 w-8 rounded-full", config.color, "text-white")}>
                        <PhaseIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{config.label}</h3>
                          <span className="text-xs text-muted-foreground">{config.xpRange}</span>
                          {isCurrentPhase && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-current-phase-${phase}`}>Current</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setCreatePhase(phase); setIsCreateMilestoneOpen(true); }}
                        data-testid={`button-add-milestone-${phase}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {phaseMilestones.length === 0 ? (
                      <div className="ml-11 py-4 text-sm text-muted-foreground">
                        No milestones yet. Add your first {config.label.toLowerCase()} milestone.
                      </div>
                    ) : (
                      <div className="ml-4 border-l-2 border-border pl-6 space-y-3">
                        {phaseMilestones.map((milestone) => {
                          const completedSteps = milestone.steps.filter(s => s.isCompleted).length;
                          const totalSteps = milestone.steps.length;
                          const stepProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                          return (
                            <Card
                              key={milestone.id}
                              className={cn(
                                "p-3 cursor-pointer hover-elevate transition-colors",
                                milestone.status === "completed" && "border-emerald-200 dark:border-emerald-800/50",
                                milestone.status === "locked" && "opacity-60",
                              )}
                              onClick={() => setSelectedMilestoneId(milestone.id)}
                              data-testid={`card-milestone-${milestone.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "flex items-center justify-center h-8 w-8 rounded-full mt-0.5 shrink-0",
                                  milestone.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                                  milestone.status === "locked" ? "bg-muted text-muted-foreground" :
                                  "bg-primary/10 text-primary"
                                )}>
                                  {milestone.status === "completed" ? <Check className="h-4 w-4" /> :
                                   milestone.status === "locked" ? <Lock className="h-4 w-4" /> :
                                   <Flag className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-sm">{milestone.title}</h4>
                                    <Badge variant="outline" className="text-xs">+{milestone.xpReward} XP</Badge>
                                  </div>
                                  {milestone.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{milestone.description}</p>
                                  )}
                                  {totalSteps > 0 && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <Progress value={stepProgress} className="h-1.5 flex-1" />
                                      <span className="text-xs text-muted-foreground shrink-0">{completedSteps}/{totalSteps}</span>
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="journal" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Progress Journal</h3>
                  <p className="text-sm text-muted-foreground">{data.stats.journalCount} entries written</p>
                </div>
                <Button onClick={() => setIsJournalOpen(true)} data-testid="button-new-journal">
                  <PenLine className="h-4 w-4 mr-2" />
                  New Entry
                </Button>
              </div>

              {data.journalEntries.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium mb-1">No journal entries yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">Reflect on your growth journey by writing your first entry</p>
                  <Button onClick={() => setIsJournalOpen(true)} data-testid="button-first-journal">
                    Write First Entry
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.journalEntries.map((entry) => (
                    <Card key={entry.id} className="p-4" data-testid={`card-journal-${entry.id}`}>
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(entry.createdAt!).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {entry.whatAccomplished && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Accomplished</p>
                          <p className="text-sm">{entry.whatAccomplished}</p>
                        </div>
                      )}
                      {entry.whatLearned && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Learned</p>
                          <p className="text-sm">{entry.whatLearned}</p>
                        </div>
                      )}
                      {entry.whatsNext && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Next Steps</p>
                          <p className="text-sm">{entry.whatsNext}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="skills" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Skill Assessment</h3>
                  <p className="text-sm text-muted-foreground">Track your skills over time</p>
                </div>
                <Button onClick={() => setIsSkillOpen(true)} data-testid="button-new-assessment">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Self-Assess
                </Button>
              </div>

              {data.skillAssessments.length > 0 ? (
                <Card className="p-4">
                  <SkillRadarChart assessments={data.skillAssessments} />
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <Radar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium mb-1">No assessments yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">Rate your skills to see your growth radar chart</p>
                  <Button onClick={() => setIsSkillOpen(true)} data-testid="button-first-assessment">
                    Start Assessment
                  </Button>
                </Card>
              )}

              {data.skillAssessments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Assessment History</h4>
                  {data.skillAssessments.map((assessment, index) => {
                    const dims = (assessment.dimensions as Array<{ name: string; score: number }>) || [];
                    const avgScore = dims.length > 0 ? (dims.reduce((sum, d) => sum + d.score, 0) / dims.length).toFixed(1) : "0";
                    return (
                      <Card key={assessment.id} className="p-3" data-testid={`card-assessment-${assessment.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">Assessment #{data.skillAssessments.length - index}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(assessment.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <Badge variant="secondary">Avg: {avgScore}/10</Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Achievements</h3>
                <p className="text-sm text-muted-foreground">
                  {data.badges.filter(b => b.earned).length} of {data.badges.length} badges earned
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.badges.map((badge) => {
                  const IconComponent = BADGE_ICONS[badge.icon] || Star;
                  return (
                    <Card
                      key={badge.id}
                      className={cn("p-4", !badge.earned && "opacity-50")}
                      data-testid={`card-badge-${badge.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                          badge.earned ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
                        )}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-sm">{badge.name}</h4>
                            {badge.earned && <Check className="h-3 w-3 text-emerald-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {selectedMilestone && (
        <MilestoneDetailDialog
          milestone={selectedMilestone}
          open={!!selectedMilestoneId}
          onOpenChange={(open: boolean) => !open && setSelectedMilestoneId(null)}
          journalEntries={data.journalEntries.filter(e => e.milestoneId === selectedMilestone.id)}
        />
      )}

      <CreateMilestoneDialog
        open={isCreateMilestoneOpen}
        onOpenChange={setIsCreateMilestoneOpen}
        defaultPhase={createPhase}
      />

      <JournalDialog
        open={isJournalOpen}
        onOpenChange={setIsJournalOpen}
        milestones={data.milestones}
      />

      <SkillAssessmentDialog
        open={isSkillOpen}
        onOpenChange={setIsSkillOpen}
      />
    </div>
  );
}
