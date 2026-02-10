import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Check, Flag, Lock, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useXpToast } from "@/hooks/use-xp-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneStep, JournalEntry } from "@shared/schema";

interface MilestoneWithSteps extends Milestone {
  steps: MilestoneStep[];
}

interface MilestoneDetailDialogProps {
  milestone: MilestoneWithSteps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journalEntries: JournalEntry[];
}

export function MilestoneDetailDialog({ milestone, open, onOpenChange, journalEntries }: MilestoneDetailDialogProps) {
  const [newStepTitle, setNewStepTitle] = useState("");
  const { toast } = useToast();
  const { showXpToast } = useXpToast();

  const completedSteps = milestone.steps.filter(s => s.isCompleted).length;
  const totalSteps = milestone.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const addStepMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", `/api/career/milestones/${milestone.id}/steps`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      setNewStepTitle("");
      toast({ title: "Step added" });
    },
    onError: () => {
      toast({ title: "Failed to add step", variant: "destructive" });
    },
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ stepId, isCompleted }: { stepId: string; isCompleted: boolean }) => {
      const res = await apiRequest("PATCH", `/api/career/steps/${stepId}`, { isCompleted });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      showXpToast(data.xpAwarded, "Step completed");
    },
    onError: () => {
      toast({ title: "Failed to update step", variant: "destructive" });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return apiRequest("DELETE", `/api/career/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      toast({ title: "Step removed" });
    },
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/career/milestones/${milestone.id}`, { status: "completed" });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Milestone completed! Great job!" });
      onOpenChange(false);
      showXpToast(data.xpAwarded, "Milestone completed");
    },
    onError: () => {
      toast({ title: "Failed to complete milestone", variant: "destructive" });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/career/milestones/${milestone.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      toast({ title: "Milestone deleted" });
      onOpenChange(false);
    },
  });

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    addStepMutation.mutate(newStepTitle.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
              milestone.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
              milestone.status === "locked" ? "bg-muted text-muted-foreground" :
              "bg-primary/10 text-primary"
            )}>
              {milestone.status === "completed" ? <Check className="h-4 w-4" /> :
               milestone.status === "locked" ? <Lock className="h-4 w-4" /> :
               <Flag className="h-4 w-4" />}
            </div>
            <DialogTitle className="flex-1">{milestone.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {milestone.description && (
            <p className="text-sm text-muted-foreground">{milestone.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="capitalize">{milestone.phase}</Badge>
            <Badge variant="secondary">+{milestone.xpReward} XP</Badge>
            {milestone.status === "completed" && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Completed
              </Badge>
            )}
          </div>

          {totalSteps > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completedSteps}/{totalSteps} steps</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Steps</h4>
            {milestone.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 group" data-testid={`step-${step.id}`}>
                <Checkbox
                  checked={step.isCompleted}
                  onCheckedChange={(checked) => {
                    toggleStepMutation.mutate({ stepId: step.id, isCompleted: !!checked });
                  }}
                  disabled={milestone.status === "completed"}
                  data-testid={`checkbox-step-${step.id}`}
                />
                <span className={cn("text-sm flex-1", step.isCompleted && "line-through text-muted-foreground")}>
                  {step.title}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="invisible group-hover:visible h-7 w-7"
                  onClick={() => deleteStepMutation.mutate(step.id)}
                  data-testid={`button-delete-step-${step.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {milestone.status !== "completed" && (
              <form onSubmit={handleAddStep} className="flex items-center gap-2">
                <Input
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="Add a step..."
                  className="flex-1"
                  data-testid="input-new-step"
                />
                <Button type="submit" size="icon" disabled={!newStepTitle.trim() || addStepMutation.isPending} data-testid="button-add-step">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>

          {journalEntries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Related Journal Entries</h4>
              </div>
              {journalEntries.map((entry) => (
                <div key={entry.id} className="text-sm border-l-2 border-border pl-3 py-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(entry.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  {entry.whatAccomplished && <p>{entry.whatAccomplished}</p>}
                  {entry.whatLearned && <p className="text-muted-foreground">{entry.whatLearned}</p>}
                </div>
              ))}
            </div>
          )}

          {milestone.status !== "completed" && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMilestoneMutation.mutate()}
                disabled={deleteMilestoneMutation.isPending}
                data-testid="button-delete-milestone"
              >
                Delete
              </Button>
              <Button
                onClick={() => completeMilestoneMutation.mutate()}
                disabled={completeMilestoneMutation.isPending}
                data-testid="button-complete-milestone"
              >
                {completeMilestoneMutation.isPending ? "Completing..." : "Mark Complete"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
