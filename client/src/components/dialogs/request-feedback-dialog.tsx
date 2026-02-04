import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, Loader2, Search, Calendar } from "lucide-react";
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Employee } from "@shared/schema";
import { cn } from "@/lib/utils";

const requestFeedbackSchema = z.object({
  responderId: z.string().min(1, "Please select who to request feedback from"),
  prompt: z.string().optional(),
  deadline: z.date().optional(),
});

type RequestFeedbackFormValues = z.infer<typeof requestFeedbackSchema>;

interface RequestFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RequestFeedbackFormValues) => Promise<void>;
  employees: Employee[];
  currentEmployeeId?: string;
}

const PROMPT_TEMPLATES = [
  "How can I improve my communication?",
  "What's one thing I could do better in our collaboration?",
  "How am I doing on my current project?",
  "What skills should I focus on developing?",
  "How can I be a better teammate?",
];

export function RequestFeedbackDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  employees,
  currentEmployeeId 
}: RequestFeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const availableEmployees = employees.filter(e => e.id !== currentEmployeeId);
  const filteredEmployees = searchQuery 
    ? availableEmployees.filter(e => 
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableEmployees;

  const form = useForm<RequestFeedbackFormValues>({
    resolver: zodResolver(requestFeedbackSchema),
    defaultValues: {
      responderId: "",
      prompt: "",
      deadline: undefined,
    },
  });

  const selectedResponder = employees.find(e => e.id === form.watch("responderId"));

  const handleSubmit = async (values: RequestFeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      setSearchQuery("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Request Feedback
          </DialogTitle>
          <DialogDescription>
            Ask a teammate for feedback to help you grow.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="responderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who would you like feedback from?</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {selectedResponder ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={selectedResponder.profileImageUrl || undefined} 
                              alt={`${selectedResponder.firstName} ${selectedResponder.lastName}`} 
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {selectedResponder.firstName?.[0]}{selectedResponder.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {selectedResponder.firstName} {selectedResponder.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{selectedResponder.title}</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => field.onChange("")}
                          >
                            Change
                          </Button>
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
                              data-testid="input-request-search"
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
                                  data-testid={`select-responder-${employee.id}`}
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
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What would you like feedback on? (optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea 
                        placeholder="Ask a specific question or leave blank for general feedback..."
                        className="resize-none"
                        rows={2}
                        {...field}
                        data-testid="input-request-prompt"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {PROMPT_TEMPLATES.map((template) => (
                          <Button
                            key={template}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => field.onChange(template)}
                          >
                            {template}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-deadline"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-request"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-send-request">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
