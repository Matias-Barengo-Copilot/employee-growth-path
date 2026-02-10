import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useXpToast } from "@/hooks/use-xp-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DEFAULT_DIMENSIONS = [
  "Technical Skills",
  "Communication",
  "Leadership",
  "Problem Solving",
  "Collaboration",
  "Creativity",
];

interface SkillAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillAssessmentDialog({ open, onOpenChange }: SkillAssessmentDialogProps) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_DIMENSIONS.map(d => [d, 5]))
  );
  const { toast } = useToast();
  const { showXpToast } = useXpToast();

  const createMutation = useMutation({
    mutationFn: async (dimensions: Array<{ name: string; score: number }>) => {
      const res = await apiRequest("POST", "/api/career/skills", { dimensions });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Skill assessment saved" });
      setScores(Object.fromEntries(DEFAULT_DIMENSIONS.map(d => [d, 5])));
      onOpenChange(false);
      showXpToast(data.xpAwarded, "Skills assessed");
    },
    onError: () => {
      toast({ title: "Failed to save assessment", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dimensions = Object.entries(scores).map(([name, score]) => ({ name, score }));
    createMutation.mutate(dimensions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skill Self-Assessment</DialogTitle>
          <DialogDescription>Rate yourself from 1-10 in each area</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {DEFAULT_DIMENSIONS.map((dim) => (
            <div key={dim} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{dim}</Label>
                <span className="text-sm font-medium tabular-nums w-6 text-right">{scores[dim]}</span>
              </div>
              <Slider
                value={[scores[dim]]}
                onValueChange={([val]) => setScores(prev => ({ ...prev, [dim]: val }))}
                min={1}
                max={10}
                step={1}
                data-testid={`slider-${dim.toLowerCase().replace(/\s+/g, "-")}`}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-assessment">
              {createMutation.isPending ? "Saving..." : "Save Assessment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
