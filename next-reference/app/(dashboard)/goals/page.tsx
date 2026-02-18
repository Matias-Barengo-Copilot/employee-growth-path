'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Target, Plus, Pencil, Trash2, Users, User, CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { TabBar, type TabDefinition } from '@/components/shared/TabBar';
import { useToast } from '@/lib/hooks/useToast';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { usePagination } from '@/lib/hooks/usePagination';
import type { PaginationMetadata } from '@/lib/types';

interface Goal {
  id: string;
  employeeId: string;
  companyId: string;
  title: string;
  description: string | null;
  category: 'growth' | 'delivery' | 'leadership' | 'learning';
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed';
  visibility: 'private' | 'manager' | 'team';
  progress: number;
  quarter: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName: string;
}

type Category = 'all' | 'growth' | 'delivery' | 'leadership' | 'learning';
type Scope = 'my' | 'team';

interface GoalFormData {
  title: string;
  description: string;
  category: 'growth' | 'delivery' | 'leadership' | 'learning';
  visibility: 'private' | 'manager' | 'team';
  dueDate: string;
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed';
  progress: number;
}

const EMPTY_FORM: GoalFormData = {
  title: '',
  description: '',
  category: 'growth',
  visibility: 'private',
  dueDate: '',
  status: 'not_started',
  progress: 0,
};

const STATUS_ACCENT_COLORS: Record<string, string> = {
  not_started: 'bg-gray-400',
  on_track: 'bg-green-500',
  at_risk: 'bg-amber-500',
  completed: 'bg-blue-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  growth: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  delivery: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  leadership: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  learning: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

const PROGRESS_BAR_COLORS: Record<string, string> = {
  not_started: 'bg-gray-400',
  on_track: 'bg-green-500',
  at_risk: 'bg-amber-500',
  completed: 'bg-blue-500',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  on_track: 'On Track',
  at_risk: 'At Risk',
  completed: 'Completed',
};

const CATEGORY_LABELS: Record<string, string> = {
  growth: 'Growth',
  delivery: 'Delivery',
  leadership: 'Leadership',
  learning: 'Learning',
};

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Private',
  manager: 'Manager',
  team: 'Team',
};

const CATEGORIES: Category[] = ['all', 'growth', 'delivery', 'leadership', 'learning'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDueDateInfo(dueDate: string | null, status: string): { label: string; className: string } | null {
  if (!dueDate || status === 'completed') return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Overdue by ${Math.abs(diffDays)}d`, className: 'text-red-600 dark:text-red-400' };
  }
  if (diffDays === 0) {
    return { label: 'Due today', className: 'text-amber-600 dark:text-amber-400' };
  }
  if (diffDays <= 7) {
    return { label: `Due in ${diffDays}d`, className: 'text-amber-600 dark:text-amber-400' };
  }
  const mm = String(due.getMonth() + 1).padStart(2, '0');
  const dd = String(due.getDate()).padStart(2, '0');
  const yyyy = due.getFullYear();
  return { label: `Due ${mm}/${dd}/${yyyy}`, className: 'text-muted-foreground' };
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'completed') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return due < now;
}

export default function GoalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { page, limit, handlePageChange, handleItemsPerPageChange } = usePagination({
    defaultPage: 1,
    defaultLimit: 20,
  });

  const categoryParam = searchParams.get('category') as Category | null;
  const scopeParam = searchParams.get('scope') as Scope | null;

  const currentEmployeeId = session?.user?.employeeId;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>(
    categoryParam && ['growth', 'delivery', 'leadership', 'learning'].includes(categoryParam) ? categoryParam : 'all'
  );
  const [scope, setScope] = useState<Scope>(scopeParam === 'team' ? 'team' : 'my');
  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status === 'on_track').length;
    const atRiskOrOverdue = goals.filter(g => g.status === 'at_risk' || isOverdue(g.dueDate, g.status)).length;
    const avgProgress = total > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / total) : 0;
    return { total, completed, inProgress, atRiskOrOverdue, avgProgress };
  }, [goals]);

  const scopeTabs: TabDefinition<Scope>[] = [
    { key: 'my', label: 'My Goals', icon: User },
    { key: 'team', label: 'Team Goals', icon: Users },
  ];

  const handleCategoryChange = useCallback((cat: Category) => {
    setActiveCategory(cat);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (cat !== 'all') {
      params.set('category', cat);
    } else {
      params.delete('category');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleScopeChange = useCallback((newScope: Scope) => {
    setScope(newScope);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (newScope === 'team') {
      params.set('scope', 'team');
    } else {
      params.delete('scope');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), scope });
      if (activeCategory !== 'all') {
        params.set('category', activeCategory);
      }
      const res = await fetch(`/api/goals?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setGoals(json.data.data);
        setPagination(json.data.pagination);
      }
    } catch {
      error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [error, page, limit, activeCategory, scope]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  function openCreate() {
    setFormData(EMPTY_FORM);
    setCreateOpen(true);
  }

  function openEdit(goal: Goal) {
    setFormData({
      title: goal.title,
      description: goal.description ?? '',
      category: goal.category,
      visibility: goal.visibility,
      dueDate: goal.dueDate ? goal.dueDate.split('T')[0] : '',
      status: goal.status,
      progress: goal.progress,
    });
    setEditGoal(goal);
  }

  async function handleCreate() {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formData.title,
        category: formData.category,
        visibility: formData.visibility,
      };
      if (formData.description) body.description = formData.description;
      if (formData.dueDate) body.dueDate = formData.dueDate;

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        success('Goal created');
        setCreateOpen(false);
        fetchGoals();
      } else {
        error('Failed to create goal');
      }
    } catch {
      error('Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editGoal || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        visibility: formData.visibility,
        status: formData.status,
        progress: formData.progress,
        dueDate: formData.dueDate || null,
      };

      const res = await fetch(`/api/goals/${editGoal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        success('Goal updated');
        setEditGoal(null);
        fetchGoals();
      } else {
        error('Failed to update goal');
      }
    } catch {
      error('Failed to update goal');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(goalId: string) {
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        success('Goal deleted');
        setEditGoal(null);
        fetchGoals();
      } else {
        error('Failed to delete goal');
      }
    } catch {
      error('Failed to delete goal');
    }
  }

  const isTeamView = scope === 'team';

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Goals</h1>
        </div>
        <Button onClick={openCreate} data-testid="button-add-goal">
          <Plus />
          Add Goal
        </Button>
      </div>

      <TabBar
        tabs={scopeTabs}
        activeTab={scope}
        onTabChange={handleScopeChange}
        testIdPrefix="tab"
      />

      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <GaugeCard
            title="Completed"
            value={stats.completed}
            total={stats.total}
            color="#3b82f6"
            testId="stat-completed"
          />
          <GaugeCard
            title="On Track"
            value={stats.inProgress}
            total={stats.total}
            color="#22c55e"
            testId="stat-in-progress"
          />
          <GaugeCard
            title="At Risk"
            value={stats.atRiskOrOverdue}
            total={stats.total}
            color="#f59e0b"
            testId="stat-at-risk"
          />
          <GaugeCard
            title="Avg Progress"
            value={stats.avgProgress}
            total={100}
            color="#8b5cf6"
            suffix="%"
            testId="stat-avg-progress"
          />
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16" data-testid="text-empty-state">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Target className="size-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">
                {isTeamView ? 'No team goals yet' : 'Set your first goal'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {isTeamView
                  ? 'When teammates share their goals, they will appear here so you can support each other.'
                  : 'Goals help you stay focused and track your professional growth. Start by creating one.'}
              </p>
            </div>
            {!isTeamView && (
              <Button onClick={openCreate} data-testid="button-empty-add-goal">
                <Plus />
                Create Your First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const dueDateInfo = getDueDateInfo(goal.dueDate, goal.status);
              return (
                <Card
                  key={goal.id}
                  className={`relative overflow-hidden ${!isTeamView ? 'cursor-pointer' : ''}`}
                  onClick={() => !isTeamView ? openEdit(goal) : undefined}
                  data-testid={`card-goal-${goal.id}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_ACCENT_COLORS[goal.status]}`} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm leading-snug" data-testid={`text-title-${goal.id}`}>
                        {goal.title}
                      </h3>
                      {!isTeamView && <Pencil className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <Badge
                        variant="outline"
                        className={CATEGORY_COLORS[goal.category]}
                        data-testid={`badge-category-${goal.id}`}
                      >
                        {CATEGORY_LABELS[goal.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground" data-testid={`text-status-${goal.id}`}>
                        {STATUS_LABELS[goal.status]}
                      </span>
                      {isTeamView && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-visibility-${goal.id}`}>
                          {VISIBILITY_LABELS[goal.visibility]}
                        </Badge>
                      )}
                    </div>

                    {isTeamView && (
                      <div className="flex items-center gap-2 mb-3" data-testid={`text-owner-${goal.id}`}>
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(goal.employeeName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {goal.employeeName}
                        </span>
                      </div>
                    )}

                    {goal.description && (
                      <p className="mb-3 text-xs text-muted-foreground line-clamp-2" data-testid={`text-description-${goal.id}`}>
                        {goal.description}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-medium" data-testid={`text-progress-${goal.id}`}>{goal.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted" data-testid={`progress-bar-${goal.id}`}>
                        <div
                          className={`h-full rounded-full transition-all ${PROGRESS_BAR_COLORS[goal.status]}`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {dueDateInfo && (
                      <div className="flex items-center gap-1.5 mt-2.5" data-testid={`text-due-${goal.id}`}>
                        <Clock className="size-3 shrink-0" />
                        <span className={`text-xs font-medium ${dueDateInfo.className}`}>
                          {dueDateInfo.label}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          showItemsPerPageSelector={true}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="dialog-create-goal">
          <DialogHeader>
            <DialogTitle>Create Goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleCreate}
            submitting={submitting}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editGoal} onOpenChange={(open) => { if (!open) setEditGoal(null); }}>
        <DialogContent data-testid="dialog-edit-goal">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdate}
            submitting={submitting}
            mode="edit"
          />
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => editGoal && handleDelete(editGoal.id)}
              data-testid="button-delete-goal"
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GaugeCard({
  title,
  value,
  total,
  color,
  suffix = '',
  testId,
}: {
  title: string;
  value: number;
  total: number;
  color: string;
  suffix?: string;
  testId: string;
}) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  const radius = 40;
  const strokeWidth = 8;
  const cx = 50;
  const cy = 50;
  const startAngle = Math.PI;
  const endAngle = startAngle + Math.PI * ratio;
  const bgEndAngle = startAngle + Math.PI;

  const arcPath = (start: number, end: number) => {
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-4 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-1">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">
            {suffix ? `Target: 100%` : `Target: ${total}`}
          </span>
        </div>
        <div className="relative w-24 h-14">
          <svg viewBox="0 0 100 55" className="w-full h-full">
            <path
              d={arcPath(startAngle, bgEndAngle)}
              fill="none"
              stroke="currentColor"
              className="text-muted/40"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {ratio > 0 && (
              <path
                d={arcPath(startAngle, endAngle)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-end justify-center pb-0.5">
            <span className="text-2xl font-bold" style={{ color }}>
              {value}{suffix}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

function GoalForm({
  formData,
  setFormData,
  onSubmit,
  submitting,
  mode,
}: {
  formData: GoalFormData;
  setFormData: (d: GoalFormData) => void;
  onSubmit: () => void;
  submitting: boolean;
  mode: 'create' | 'edit';
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="goal-title">Title</Label>
        <Input
          id="goal-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter goal title"
          data-testid="input-goal-title"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-description">Description</Label>
        <Textarea
          id="goal-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your goal"
          data-testid="input-goal-description"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData({ ...formData, category: v as GoalFormData['category'] })}
          >
            <SelectTrigger className="w-full" data-testid="select-goal-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="leadership">Leadership</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Visibility</Label>
          <Select
            value={formData.visibility}
            onValueChange={(v) => setFormData({ ...formData, visibility: v as GoalFormData['visibility'] })}
          >
            <SelectTrigger className="w-full" data-testid="select-goal-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private (only you)</SelectItem>
              <SelectItem value="manager">Manager (supervisors & HR)</SelectItem>
              <SelectItem value="team">Team (everyone)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode === 'edit' && (
        <>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as GoalFormData['status'] })}
            >
              <SelectTrigger className="w-full" data-testid="select-goal-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Progress: {formData.progress}%</Label>
            <div className="flex flex-wrap gap-2" data-testid="progress-presets">
              {PROGRESS_PRESETS.map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant={formData.progress === val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, progress: val })}
                  data-testid={`button-progress-${val}`}
                >
                  {val}%
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.progress}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setFormData({ ...formData, progress: v });
                }}
                className="w-24"
                data-testid="input-goal-progress"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="goal-due-date">Due Date (MM/DD/YYYY)</Label>
        <Input
          id="goal-due-date"
          type="text"
          placeholder="MM/DD/YYYY"
          value={formData.dueDate ? (() => {
            const [y, m, d] = formData.dueDate.split('-');
            return y && m && d ? `${m}/${d}/${y}` : formData.dueDate;
          })() : ''}
          onChange={(e) => {
            let val = e.target.value.replace(/[^\d/]/g, '');
            const digits = val.replace(/\//g, '');
            if (digits.length <= 2) {
              val = digits;
            } else if (digits.length <= 4) {
              val = `${digits.slice(0, 2)}/${digits.slice(2)}`;
            } else {
              val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
            }
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
              const [mm, dd, yyyy] = val.split('/');
              setFormData({ ...formData, dueDate: `${yyyy}-${mm}-${dd}` });
            } else {
              setFormData({ ...formData, dueDate: val });
            }
          }}
          maxLength={10}
          data-testid="input-goal-due-date"
        />
      </div>

      <Button
        onClick={onSubmit}
        disabled={submitting || !formData.title.trim()}
        data-testid={mode === 'create' ? 'button-submit-create' : 'button-submit-edit'}
      >
        {submitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Goal' : 'Save Changes')}
      </Button>
    </div>
  );
}
