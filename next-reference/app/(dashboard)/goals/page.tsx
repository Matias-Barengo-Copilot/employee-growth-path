'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Target, Plus, Pencil, Trash2, Users, User } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  at_risk: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
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

      <div className="flex flex-wrap items-center gap-2" data-testid="filter-category-bar">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange(cat)}
            data-testid={`button-filter-${cat}`}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

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
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground" data-testid="text-empty-state">
          <Target className="size-10" />
          <p className="text-sm">
            {isTeamView
              ? 'No team goals found. Goals shared with the team or manager will appear here.'
              : 'No goals found. Create your first goal to get started.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const isOwner = goal.employeeId === currentEmployeeId;
              return (
                <Card
                  key={goal.id}
                  className={`transition-shadow hover:shadow-md ${!isTeamView ? 'cursor-pointer' : ''}`}
                  onClick={() => !isTeamView ? openEdit(goal) : undefined}
                  data-testid={`card-goal-${goal.id}`}
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-sm">{goal.title}</CardTitle>
                      {!isTeamView && <Pencil className="size-3.5 text-muted-foreground shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={CATEGORY_COLORS[goal.category]}
                        data-testid={`badge-category-${goal.id}`}
                      >
                        {CATEGORY_LABELS[goal.category]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[goal.status]}
                        data-testid={`badge-status-${goal.id}`}
                      >
                        {STATUS_LABELS[goal.status]}
                      </Badge>
                      {isTeamView && (
                        <Badge variant="outline" data-testid={`badge-visibility-${goal.id}`}>
                          {VISIBILITY_LABELS[goal.visibility]}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${goal.id}`}>
                        {goal.description}
                      </p>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span data-testid={`text-progress-${goal.id}`}>{goal.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted" data-testid={`progress-bar-${goal.id}`}>
                        <div
                          className={`h-full rounded-full transition-all ${PROGRESS_BAR_COLORS[goal.status]}`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                    {goal.dueDate && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Due: {new Date(goal.dueDate).toLocaleDateString()}
                      </p>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="space-y-1.5">
            <Label htmlFor="goal-progress">Progress: {formData.progress}%</Label>
            <input
              id="goal-progress"
              type="range"
              min={0}
              max={100}
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value, 10) })}
              className="w-full accent-primary"
              data-testid="input-goal-progress"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="goal-due-date">Due Date</Label>
        <Input
          id="goal-due-date"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
