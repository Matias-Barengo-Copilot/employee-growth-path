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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Milestone } from "@shared/schema";

interface JournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Milestone[];
}

export function JournalDialog({ open, onOpenChange, milestones }: JournalDialogProps) {
  const [whatAccomplished, setWhatAccomplished] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [whatsNext, setWhatsNext] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, string | undefined>) => {
      return apiRequest("POST", "/api/career/journal", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      toast({ title: "Journal entry saved" });
      setWhatAccomplished("");
      setWhatLearned("");
      setWhatsNext("");
      setMilestoneId("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to save entry", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatAccomplished.trim() && !whatLearned.trim() && !whatsNext.trim()) {
      toast({ title: "Please fill in at least one field", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      whatAccomplished: whatAccomplished.trim() || undefined,
      whatLearned: whatLearned.trim() || undefined,
      whatsNext: whatsNext.trim() || undefined,
      milestoneId: milestoneId || undefined,
    });
  };

  const activeMilestones = milestones.filter(m => m.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Progress Journal</DialogTitle>
          <DialogDescription>Reflect on your recent growth and learning</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeMilestones.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Milestone (optional)</Label>
              <Select value={milestoneId} onValueChange={setMilestoneId}>
                <SelectTrigger data-testid="select-journal-milestone">
                  <SelectValue placeholder="Select milestone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No milestone</SelectItem>
                  {activeMilestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="what-accomplished">What did you accomplish?</Label>
            <Textarea
              id="what-accomplished"
              value={whatAccomplished}
              onChange={(e) => setWhatAccomplished(e.target.value)}
              placeholder="Describe what you achieved recently..."
              data-testid="input-accomplished"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="what-learned">What did you learn?</Label>
            <Textarea
              id="what-learned"
              value={whatLearned}
              onChange={(e) => setWhatLearned(e.target.value)}
              placeholder="New skills, insights, or realizations..."
              data-testid="input-learned"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whats-next">What's next?</Label>
            <Textarea
              id="whats-next"
              value={whatsNext}
              onChange={(e) => setWhatsNext(e.target.value)}
              placeholder="Goals or plans for your next steps..."
              data-testid="input-whats-next"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={(!whatAccomplished.trim() && !whatLearned.trim() && !whatsNext.trim()) || createMutation.isPending}
              data-testid="button-submit-journal"
            >
              {createMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
