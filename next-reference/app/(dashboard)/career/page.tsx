'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  TrendingUp,
  Award,
  Star,
  Lock,
  CheckCircle,
  BookOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

interface MilestoneStep {
  id: string;
  milestoneId: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface Milestone {
  id: string;
  careerPathId: string;
  phase: string;
  title: string;
  description: string | null;
  status: 'locked' | 'active' | 'completed';
  position: number;
  xpReward: number;
  completedAt: string | null;
  createdAt: string;
  steps: MilestoneStep[];
}

interface CareerData {
  id: string;
  employeeId: string;
  companyId: string;
  currentPhase: string;
  xp: number;
  seasonXp: number;
  lifetimeXp: number;
  seasonQuarter: number;
  seasonYear: number;
  currentStreak: number;
  longestStreak: number;
  lastJournalDate: string | null;
  lastActiveWeek: string | null;
  weeklyActionCount: number;
  consistencyStreak: number;
  createdAt: string;
  milestones: Milestone[];
}

interface XpSummary {
  seasonXp: number;
  lifetimeXp: number;
  level: number;
  levelName: string;
  weeklyBreakdown: Record<string, number>;
  streak: number;
  consistencyStreak: number;
  nextLevelXp?: number;
  xpToNextLevel?: number;
}

interface JournalEntry {
  id: string;
  employeeId: string;
  companyId: string;
  milestoneId: string | null;
  whatLearned: string | null;
  whatAccomplished: string | null;
  whatsNext: string | null;
  createdAt: string;
}

const PHASES = ['foundation', 'growing', 'leading', 'mastering'] as const;

const PHASE_CONFIG: Record<string, { label: string; min: number; max: number; color: string; bgColor: string; textColor: string; borderColor: string; badgeBg: string }> = {
  foundation: { label: 'Foundation', min: 0, max: 200, color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800', badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  growing: { label: 'Growing', min: 200, max: 500, color: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', textColor: 'text-emerald-700 dark:text-emerald-300', borderColor: 'border-emerald-200 dark:border-emerald-800', badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  leading: { label: 'Leading', min: 500, max: 1000, color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30', textColor: 'text-purple-700 dark:text-purple-300', borderColor: 'border-purple-200 dark:border-purple-800', badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  mastering: { label: 'Mastering', min: 1000, max: 2000, color: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-700 dark:text-amber-300', borderColor: 'border-amber-200 dark:border-amber-800', badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' }> = {
  locked: { label: 'Locked', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
};

function getPhaseProgress(xp: number, phase: string): number {
  const config = PHASE_CONFIG[phase];
  if (!config) return 0;
  const range = config.max - config.min;
  const progress = Math.max(0, Math.min(xp - config.min, range));
  return Math.round((progress / range) * 100);
}

export default function CareerPage() {
  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalSectionOpen, setJournalSectionOpen] = useState(false);
  const [journalForm, setJournalForm] = useState({ whatLearned: '', whatAccomplished: '', whatsNext: '' });
  const [submittingJournal, setSubmittingJournal] = useState(false);
  const [togglingSteps, setTogglingSteps] = useState<Set<string>>(new Set());
  const { success, error } = useToast();

  const fetchCareer = useCallback(async () => {
    try {
      const res = await fetch('/api/career');
      const json = await res.json();
      if (json.success) {
        setCareerData(json.data);
        const activeMilestones = (json.data.milestones as Milestone[])
          .filter((m) => m.status === 'active')
          .map((m) => m.id);
        setExpandedMilestones((prev) => {
          const next = new Set(prev);
          activeMilestones.forEach((id) => next.add(id));
          return next;
        });
      }
    } catch {
      error('Failed to load career data');
    }
  }, [error]);

  const fetchXpSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/xp/summary');
      const json = await res.json();
      if (json.success) setXpSummary(json.data);
    } catch {
      // silent
    }
  }, []);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch('/api/career/journal');
      const json = await res.json();
      if (json.success) setJournalEntries(json.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCareer(), fetchXpSummary(), fetchJournal()]).finally(() => setLoading(false));
  }, [fetchCareer, fetchXpSummary, fetchJournal]);

  async function toggleStep(milestoneId: string, stepId: string, currentValue: boolean) {
    setTogglingSteps((prev) => new Set(prev).add(stepId));
    try {
      const res = await fetch(`/api/career/milestones/${milestoneId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentValue }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchCareer();
        await fetchXpSummary();
      } else {
        error('Failed to update step');
      }
    } catch {
      error('Failed to update step');
    } finally {
      setTogglingSteps((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
    }
  }

  async function handleSubmitJournal() {
    if (!journalForm.whatLearned.trim() && !journalForm.whatAccomplished.trim() && !journalForm.whatsNext.trim()) return;
    setSubmittingJournal(true);
    try {
      const body: Record<string, string> = {};
      if (journalForm.whatLearned.trim()) body.whatLearned = journalForm.whatLearned;
      if (journalForm.whatAccomplished.trim()) body.whatAccomplished = journalForm.whatAccomplished;
      if (journalForm.whatsNext.trim()) body.whatsNext = journalForm.whatsNext;

      const res = await fetch('/api/career/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        success('Journal entry added');
        setJournalOpen(false);
        setJournalForm({ whatLearned: '', whatAccomplished: '', whatsNext: '' });
        fetchJournal();
        fetchXpSummary();
      } else {
        error('Failed to add journal entry');
      }
    } catch {
      error('Failed to add journal entry');
    } finally {
      setSubmittingJournal(false);
    }
  }

  function toggleMilestoneExpanded(id: string) {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Career Growth</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-2/3 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentPhase = careerData?.currentPhase ?? 'foundation';
  const phaseConfig = PHASE_CONFIG[currentPhase];
  const totalXp = careerData?.lifetimeXp ?? 0;
  const phaseProgress = getPhaseProgress(totalXp, currentPhase);
  const milestonesByPhase = PHASES.reduce((acc, phase) => {
    acc[phase] = (careerData?.milestones ?? []).filter((m) => m.phase === phase);
    return acc;
  }, {} as Record<string, Milestone[]>);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="career-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Career Growth</h1>
        </div>
        <Badge variant="outline" className={phaseConfig.badgeBg} data-testid="badge-current-phase">
          {phaseConfig.label} Phase
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-phase-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Award className="size-4 text-muted-foreground" />
              Phase Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={phaseConfig.textColor} data-testid="text-phase-name">{phaseConfig.label}</span>
                <span className="text-muted-foreground" data-testid="text-phase-range">{phaseConfig.min}-{phaseConfig.max === 2000 ? '1000+' : phaseConfig.max} XP</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted" data-testid="progress-bar-phase">
                <div
                  className={`h-full rounded-full transition-all ${phaseConfig.color}`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground" data-testid="text-xp-total">{totalXp} XP total</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-season-level">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="size-4 text-muted-foreground" />
              Season Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-lg font-semibold" data-testid="text-level-name">{xpSummary?.levelName ?? 'Starter'}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-season-xp">
                {xpSummary?.seasonXp ?? 0} Season XP
              </p>
              <p className="text-xs text-muted-foreground">Level {xpSummary?.level ?? 1}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-streak">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="size-4 text-muted-foreground" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-lg font-semibold" data-testid="text-current-streak">{careerData?.currentStreak ?? 0} weeks</p>
              <p className="text-sm text-muted-foreground" data-testid="text-longest-streak">
                Longest: {careerData?.longestStreak ?? 0} weeks
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-consistency-streak">
                Consistency: {xpSummary?.consistencyStreak ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-lifetime-xp">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-muted-foreground" />
              Lifetime XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-lg font-semibold" data-testid="text-lifetime-xp">{xpSummary?.lifetimeXp ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total earned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4" data-testid="section-career-map">
        <h2 className="text-lg font-semibold" data-testid="text-career-map-title">Career Map</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PHASES.map((phase) => {
            const config = PHASE_CONFIG[phase];
            const phaseMilestones = milestonesByPhase[phase] ?? [];
            const isCurrentPhase = currentPhase === phase;
            return (
              <div key={phase} className="flex flex-col gap-3" data-testid={`section-phase-${phase}`}>
                <div className={`flex items-center gap-2 rounded-md px-3 py-2 ${config.bgColor}`}>
                  <div className={`size-2 rounded-full ${config.color}`} />
                  <span className={`text-sm font-medium ${config.textColor}`} data-testid={`text-phase-label-${phase}`}>
                    {config.label}
                  </span>
                  {isCurrentPhase && (
                    <Badge variant="outline" className="ml-auto text-[10px]" data-testid={`badge-current-${phase}`}>
                      Current
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {phaseMilestones.map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      phaseConfig={config}
                      expanded={expandedMilestones.has(milestone.id)}
                      onToggleExpanded={() => toggleMilestoneExpanded(milestone.id)}
                      onToggleStep={toggleStep}
                      togglingSteps={togglingSteps}
                    />
                  ))}
                  {phaseMilestones.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">No milestones</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3" data-testid="section-journal">
        <button
          className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left"
          onClick={() => setJournalSectionOpen(!journalSectionOpen)}
          data-testid="button-toggle-journal-section"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Journal</h2>
          </div>
          {journalSectionOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </button>

        {journalSectionOpen && (
          <div className="space-y-3">
            <Button onClick={() => setJournalOpen(true)} data-testid="button-add-journal">
              <Plus />
              Add Journal Entry
            </Button>

            {journalEntries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground" data-testid="text-no-journal">
                No journal entries yet. Start reflecting on your growth.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {journalEntries.map((entry) => (
                  <Card key={entry.id} data-testid={`card-journal-${entry.id}`}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {entry.whatLearned && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Learned</p>
                            <p className="line-clamp-2" data-testid={`text-journal-learned-${entry.id}`}>{entry.whatLearned}</p>
                          </div>
                        )}
                        {entry.whatAccomplished && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Accomplished</p>
                            <p className="line-clamp-2" data-testid={`text-journal-accomplished-${entry.id}`}>{entry.whatAccomplished}</p>
                          </div>
                        )}
                        {entry.whatsNext && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">What&apos;s Next</p>
                            <p className="line-clamp-2" data-testid={`text-journal-next-${entry.id}`}>{entry.whatsNext}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
        <DialogContent data-testid="dialog-journal">
          <DialogHeader>
            <DialogTitle>Add Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="journal-learned">What did you learn?</Label>
              <Textarea
                id="journal-learned"
                value={journalForm.whatLearned}
                onChange={(e) => setJournalForm({ ...journalForm, whatLearned: e.target.value })}
                placeholder="Reflect on what you learned recently..."
                data-testid="input-journal-learned"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="journal-accomplished">What did you accomplish?</Label>
              <Textarea
                id="journal-accomplished"
                value={journalForm.whatAccomplished}
                onChange={(e) => setJournalForm({ ...journalForm, whatAccomplished: e.target.value })}
                placeholder="What have you accomplished?"
                data-testid="input-journal-accomplished"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="journal-next">What&apos;s next?</Label>
              <Textarea
                id="journal-next"
                value={journalForm.whatsNext}
                onChange={(e) => setJournalForm({ ...journalForm, whatsNext: e.target.value })}
                placeholder="What are your next steps?"
                data-testid="input-journal-next"
              />
            </div>
            <Button
              onClick={handleSubmitJournal}
              disabled={submittingJournal || (!journalForm.whatLearned.trim() && !journalForm.whatAccomplished.trim() && !journalForm.whatsNext.trim())}
              data-testid="button-submit-journal"
            >
              {submittingJournal ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneCard({
  milestone,
  phaseConfig,
  expanded,
  onToggleExpanded,
  onToggleStep,
  togglingSteps,
}: {
  milestone: Milestone;
  phaseConfig: typeof PHASE_CONFIG[string];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleStep: (milestoneId: string, stepId: string, currentValue: boolean) => void;
  togglingSteps: Set<string>;
}) {
  const isLocked = milestone.status === 'locked';
  const isCompleted = milestone.status === 'completed';
  const isActive = milestone.status === 'active';
  const statusConfig = STATUS_BADGE[milestone.status];
  const completedSteps = milestone.steps.filter((s) => s.isCompleted).length;
  const totalSteps = milestone.steps.length;

  return (
    <Card
      className={`transition-opacity ${isLocked ? 'opacity-50' : ''}`}
      data-testid={`card-milestone-${milestone.id}`}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isCompleted && <CheckCircle className="size-4 text-green-500 shrink-0" />}
            {isLocked && <Lock className="size-4 text-muted-foreground shrink-0" />}
            {isActive && <Star className="size-4 text-amber-500 shrink-0" />}
            <CardTitle className="text-sm" data-testid={`text-milestone-title-${milestone.id}`}>
              {milestone.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={statusConfig.variant}
              data-testid={`badge-milestone-status-${milestone.id}`}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground" data-testid={`text-milestone-xp-${milestone.id}`}>
            +{milestone.xpReward} XP
          </span>
          {isCompleted && milestone.completedAt && (
            <span className="text-xs text-muted-foreground" data-testid={`text-milestone-completed-${milestone.id}`}>
              Completed {new Date(milestone.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {isActive && totalSteps > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedSteps}/{totalSteps} steps
            </span>
          )}
        </div>
      </CardHeader>

      {(isActive || isCompleted) && milestone.steps.length > 0 && (
        <CardContent>
          <button
            className="flex w-full items-center gap-1 text-xs text-muted-foreground"
            onClick={onToggleExpanded}
            data-testid={`button-toggle-steps-${milestone.id}`}
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {expanded ? 'Hide steps' : 'Show steps'}
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              {milestone.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-start gap-2"
                  data-testid={`step-item-${step.id}`}
                >
                  <Checkbox
                    checked={step.isCompleted}
                    onCheckedChange={() => onToggleStep(milestone.id, step.id, step.isCompleted)}
                    disabled={isLocked || togglingSteps.has(step.id)}
                    data-testid={`checkbox-step-${step.id}`}
                    className="mt-0.5"
                  />
                  <span
                    className={`text-sm ${step.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                    data-testid={`text-step-title-${step.id}`}
                  >
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
