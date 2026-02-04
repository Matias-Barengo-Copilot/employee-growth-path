import { TrendingUp, Package, Users, BookOpen, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GOAL_CATEGORIES, GOAL_STATUSES } from "@/lib/constants";
import type { Goal } from "@shared/schema";

interface GoalCardProps {
  goal: Goal;
  onEdit?: (goal: Goal) => void;
  onUpdateProgress?: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  growth: TrendingUp,
  delivery: Package,
  leadership: Users,
  learning: BookOpen,
};

export function GoalCard({ goal, onEdit, onUpdateProgress, onDelete }: GoalCardProps) {
  const categoryConfig = GOAL_CATEGORIES.find(c => c.value === goal.category);
  const statusConfig = GOAL_STATUSES.find(s => s.value === goal.status);
  const CategoryIcon = categoryIcons[goal.category] || TrendingUp;

  return (
    <Card className="hover-elevate transition-all duration-200" data-testid={`card-goal-${goal.id}`}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${categoryConfig?.color || ""}`}>
            <CategoryIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base leading-tight mb-1 line-clamp-2">
              {goal.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {goal.category}
              </Badge>
              {statusConfig && (
                <Badge className={`text-xs ${statusConfig.color}`}>
                  {statusConfig.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {(onEdit || onUpdateProgress || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-goal-menu-${goal.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onUpdateProgress && (
                <DropdownMenuItem onClick={() => onUpdateProgress(goal)} data-testid={`button-update-progress-${goal.id}`}>
                  Update Progress
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(goal)} data-testid={`button-edit-goal-${goal.id}`}>
                  Edit Goal
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(goal)} 
                  className="text-destructive"
                  data-testid={`button-delete-goal-${goal.id}`}
                >
                  Delete Goal
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {goal.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {goal.description}
          </p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{goal.progress || 0}%</span>
          </div>
          <Progress value={goal.progress || 0} className="h-2" />
        </div>
        
        {goal.quarter && (
          <p className="text-xs text-muted-foreground mt-3">
            {goal.quarter}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
