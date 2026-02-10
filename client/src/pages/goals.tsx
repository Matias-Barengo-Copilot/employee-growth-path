import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Target, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { GoalCard } from "@/components/goal-card";
import { EmptyState } from "@/components/empty-state";
import { CreateGoalDialog } from "@/components/dialogs/create-goal-dialog";
import { useToast } from "@/hooks/use-toast";
import { useXpToast } from "@/hooks/use-xp-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GOAL_CATEGORIES, GOAL_STATUSES } from "@/lib/constants";
import type { Goal, Employee } from "@shared/schema";

interface GoalsData {
  goals: Goal[];
  currentEmployee: Employee | null;
}

export default function Goals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { showXpToast } = useXpToast();

  const { data, isLoading } = useQuery<GoalsData>({
    queryKey: ["/api/goals"],
  });

  const createGoalMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/goals", values);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Goal created successfully" });
      showXpToast(data.xpAwarded, "Goal created");
    },
    onError: () => {
      toast({ title: "Failed to create goal", variant: "destructive" });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const res = await apiRequest("PATCH", `/api/goals/${id}`, values);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Goal updated successfully" });
      setEditingGoal(null);
      showXpToast(data.xpAwarded, "Goal updated");
    },
    onError: () => {
      toast({ title: "Failed to update goal", variant: "destructive" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Goal deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    },
  });

  const goals = data?.goals || [];

  const filteredGoals = goals.filter((goal) => {
    const matchesCategory = categoryFilter === "all" || goal.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || goal.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const handleCreateGoal = async (values: any) => {
    await createGoalMutation.mutateAsync(values);
  };

  const handleUpdateGoal = async (values: any) => {
    if (editingGoal) {
      await updateGoalMutation.mutateAsync({ id: editingGoal.id, ...values });
    }
  };

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Goals" 
        description="Track your professional growth"
        action={
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-goal">
            <Plus className="h-4 w-4 mr-1" />
            New Goal
          </Button>
        }
      />
      
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-category">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {GOAL_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {GOAL_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title={goals.length === 0 ? "No goals yet" : "No matching goals"}
            description={goals.length === 0 
              ? "Create your first goal to start tracking your professional growth"
              : "Try adjusting your filters"
            }
            action={goals.length === 0 ? {
              label: "Create Goal",
              onClick: () => setIsCreateOpen(true)
            } : undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={setEditingGoal}
                onUpdateProgress={setEditingGoal}
                onDelete={(g) => deleteGoalMutation.mutate(g.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateGoalDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateGoal}
      />

      <CreateGoalDialog
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(null)}
        onSubmit={handleUpdateGoal}
        goal={editingGoal}
      />
    </div>
  );
}
