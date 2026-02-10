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
import { Input } from "@/components/ui/input";
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
import { useXpToast } from "@/hooks/use-xp-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreateMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhase: string;
}

export function CreateMilestoneDialog({ open, onOpenChange, defaultPhase }: CreateMilestoneDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState(defaultPhase);
  const { toast } = useToast();
  const { showXpToast } = useXpToast();

  const createMutation = useMutation({
    mutationFn: async (values: { title: string; description?: string; phase: string }) => {
      const res = await apiRequest("POST", "/api/career/milestones", values);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      queryClient.invalidateQueries({ queryKey: ["/api/xp/summary"] });
      toast({ title: "Milestone created" });
      setTitle("");
      setDescription("");
      onOpenChange(false);
      showXpToast(data.xpAwarded, "Milestone created");
    },
    onError: () => {
      toast({ title: "Failed to create milestone", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({ title: title.trim(), description: description.trim() || undefined, phase });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
          <DialogDescription>Create a new milestone on your career journey</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-title">Title</Label>
            <Input
              id="milestone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Master React Testing"
              data-testid="input-milestone-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description (optional)</Label>
            <Textarea
              id="milestone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does completing this milestone look like?"
              data-testid="input-milestone-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-phase">Phase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger data-testid="select-milestone-phase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="growing">Growing</SelectItem>
                <SelectItem value="leading">Leading</SelectItem>
                <SelectItem value="mastering">Mastering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending} data-testid="button-submit-milestone">
              {createMutation.isPending ? "Creating..." : "Create Milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
