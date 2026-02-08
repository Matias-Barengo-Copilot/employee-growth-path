import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, Loader2, Search, EyeOff } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { FEEDBACK_TAGS } from "@/lib/constants";
import type { Employee, FeedbackRequest } from "@shared/schema";
import { cn } from "@/lib/utils";

const feedbackFormSchema = z.object({
  recipientId: z.string().min(1, "Please select a recipient"),
  keepDoing: z.string().optional(),
  considerImproving: z.string().optional(),
  isAnonymous: z.boolean(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => data.keepDoing || data.considerImproving,
  { message: "Please provide at least one type of feedback", path: ["keepDoing"] }
);

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

interface GiveFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FeedbackFormValues) => Promise<void>;
  employees: Employee[];
  currentEmployeeId?: string;
  feedbackRequest?: FeedbackRequest | null;
  preselectedRecipient?: Employee | null;
}

export function GiveFeedbackDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  employees,
  currentEmployeeId,
  feedbackRequest,
  preselectedRecipient
}: GiveFeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableEmployees = employees.filter(e => e.id !== currentEmployeeId);
  const filteredEmployees = searchQuery 
    ? availableEmployees.filter(e => 
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableEmployees;

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      recipientId: preselectedRecipient?.id || feedbackRequest?.requesterId || "",
      keepDoing: "",
      considerImproving: "",
      isAnonymous: false,
      tags: [],
    },
  });

  const selectedRecipient = preselectedRecipient || employees.find(e => e.id === form.watch("recipientId"));

  const handleSubmit = async (values: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ ...values, tags: selectedTags });
      form.reset();
      setSelectedTags([]);
      setSearchQuery("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {feedbackRequest ? "Respond to Feedback Request" : "Give Feedback"}
          </DialogTitle>
          <DialogDescription>
            {feedbackRequest 
              ? `Provide constructive feedback as requested.`
              : "Share constructive feedback to help your teammate grow."
            }
          </DialogDescription>
        </DialogHeader>
        
        {feedbackRequest?.prompt && (
          <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground mb-1">Prompt:</p>
            <p className="text-sm italic">"{feedbackRequest.prompt}"</p>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who are you giving feedback to?</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {selectedRecipient || preselectedRecipient ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={(selectedRecipient || preselectedRecipient)?.profileImageUrl || undefined} 
                              alt={`${(selectedRecipient || preselectedRecipient)?.firstName} ${(selectedRecipient || preselectedRecipient)?.lastName}`} 
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {(selectedRecipient || preselectedRecipient)?.firstName?.[0]}{(selectedRecipient || preselectedRecipient)?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {(selectedRecipient || preselectedRecipient)?.firstName} {(selectedRecipient || preselectedRecipient)?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{(selectedRecipient || preselectedRecipient)?.title}</p>
                          </div>
                          {!preselectedRecipient && !feedbackRequest && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => field.onChange("")}
                            >
                              Change
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search teammates..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                              data-testid="input-feedback-search"
                            />
                          </div>
                          <ScrollArea className="h-[150px] rounded-lg border">
                            <div className="p-2 space-y-1">
                              {filteredEmployees.map((employee) => (
                                <button
                                  key={employee.id}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(employee.id);
                                    setSearchQuery("");
                                  }}
                                  className="w-full flex items-center gap-3 p-2 rounded-md hover-elevate text-left transition-colors"
                                  data-testid={`select-feedback-recipient-${employee.id}`}
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage 
                                      src={employee.profileImageUrl || undefined} 
                                      alt={`${employee.firstName} ${employee.lastName}`} 
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                      {employee.firstName?.[0]}{employee.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {employee.firstName} {employee.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{employee.title}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="keepDoing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Keep Doing
                  </FormLabel>
                  <div className="flex items-start gap-1">
                    <FormControl>
                      <Textarea 
                        placeholder="What should they continue doing? What's working well?"
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="input-keep-doing"
                      />
                    </FormControl>
                    <VoiceInput onTranscript={(text) => field.onChange(field.value ? `${field.value} ${text}` : text)} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="considerImproving"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    Consider Improving
                  </FormLabel>
                  <div className="flex items-start gap-1">
                    <FormControl>
                      <Textarea 
                        placeholder="What could they do differently? What areas have room for growth?"
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="input-consider-improving"
                      />
                    </FormControl>
                    <VoiceInput onTranscript={(text) => field.onChange(field.value ? `${field.value} ${text}` : text)} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Tags (optional)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((tag) => (
                  <Badge
                    key={tag.value}
                    variant={selectedTags.includes(tag.value) ? "default" : "outline"}
                    className={cn("cursor-pointer transition-all")}
                    onClick={() => toggleTag(tag.value)}
                    data-testid={`feedback-tag-${tag.value}`}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Submit Anonymously
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Your name won't be shown to the recipient
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-anonymous"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-feedback"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-send-feedback">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Feedback
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
