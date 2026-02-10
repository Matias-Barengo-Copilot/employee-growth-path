import { useState } from "react";
import { Calendar as CalendarIcon, Sun, Heart, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { VoiceInput } from "@/components/voice-input";

interface RequestTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { type: string; startDate: string; endDate: string; reason?: string }) => void;
  isPending: boolean;
}

const LEAVE_TYPES = [
  { value: "vacation", label: "Vacation", icon: Sun, description: "Planned time off", color: "text-amber-600 dark:text-amber-400" },
  { value: "sick", label: "Sick Day", icon: Heart, description: "Feeling unwell", color: "text-red-600 dark:text-red-400" },
  { value: "half_day", label: "Half Day", icon: Clock, description: "Morning or afternoon off", color: "text-blue-600 dark:text-blue-400" },
  { value: "personal", label: "Personal", icon: Calendar, description: "Personal matters", color: "text-purple-600 dark:text-purple-400" },
];

export function RequestTimeOffDialog({ open, onOpenChange, onSubmit, isPending }: RequestTimeOffDialogProps) {
  const [type, setType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !startDate) return;

    const effectiveEndDate = type === "half_day" ? startDate : (endDate || startDate);
    onSubmit({ type, startDate, endDate: effectiveEndDate, reason: reason || undefined });

    setType("");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const isValid = type && startDate && (type === "half_day" || endDate || startDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            Select the type, dates, and optionally add a reason for your time off request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Type of Leave</Label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map((lt) => {
                const LTIcon = lt.icon;
                const isSelected = type === lt.value;
                return (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => setType(lt.value)}
                    className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors toggle-elevate ${isSelected ? "toggle-elevated border-primary bg-primary/5" : ""}`}
                    data-testid={`type-${lt.value}`}
                  >
                    <LTIcon className={`h-4 w-4 ${lt.color}`} />
                    <div>
                      <p className="text-sm font-medium">{lt.label}</p>
                      <p className="text-xs text-muted-foreground">{lt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">{type === "half_day" ? "Date" : "Start Date"}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                data-testid="input-start-date"
              />
            </div>
            {type !== "half_day" && (
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="reason">Reason (optional)</Label>
              <VoiceInput
                onTranscription={(text) => setReason((prev) => (prev ? prev + " " : "") + text)}
              />
            </div>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a reason for your time off request..."
              rows={3}
              data-testid="input-reason"
            />
          </div>

          <div className="flex justify-end gap-2 flex-wrap">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending} data-testid="button-submit-request">
              {isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
