import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, Loader2, Search } from "lucide-react";
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SNAP_TAGS } from "@/lib/constants";
import type { Employee } from "@shared/schema";
import { cn } from "@/lib/utils";

const snapFormSchema = z.object({
  recipientId: z.string().min(1, "Please select a recipient"),
  message: z.string().min(1, "Message is required").max(500),
  tags: z.array(z.string()).optional(),
});

type SnapFormValues = z.infer<typeof snapFormSchema>;

interface GiveSnapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SnapFormValues) => Promise<void>;
  employees: Employee[];
  currentEmployeeId?: string;
}

export function GiveSnapDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  employees,
  currentEmployeeId 
}: GiveSnapDialogProps) {
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

  const form = useForm<SnapFormValues>({
    resolver: zodResolver(snapFormSchema),
    defaultValues: {
      recipientId: "",
      message: "",
      tags: [],
    },
  });

  const selectedRecipient = employees.find(e => e.id === form.watch("recipientId"));

  const handleSubmit = async (values: SnapFormValues) => {
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
            <Sparkles className="h-5 w-5 text-amber-500" />
            Give a Snap
          </DialogTitle>
          <DialogDescription>
            Recognize a teammate for their great work. Snaps take less than 15 seconds!
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who are you recognizing?</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {selectedRecipient ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={selectedRecipient.profileImageUrl || undefined} 
                              alt={`${selectedRecipient.firstName} ${selectedRecipient.lastName}`} 
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {selectedRecipient.firstName?.[0]}{selectedRecipient.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {selectedRecipient.firstName} {selectedRecipient.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{selectedRecipient.title}</p>
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
                              data-testid="input-snap-search"
                            />
                          </div>
                          <ScrollArea className="h-[180px] rounded-lg border">
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
                                  data-testid={`select-recipient-${employee.id}`}
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
                              {filteredEmployees.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No teammates found
                                </p>
                              )}
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
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <div className="flex items-start gap-1">
                    <FormControl>
                      <Textarea 
                        placeholder="What would you like to recognize them for?"
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="input-snap-message"
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
                {SNAP_TAGS.map((tag) => (
                  <Badge
                    key={tag.value}
                    variant={selectedTags.includes(tag.value) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedTags.includes(tag.value) && tag.color
                    )}
                    onClick={() => toggleTag(tag.value)}
                    data-testid={`tag-${tag.value}`}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-snap"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-send-snap">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Sparkles className="h-4 w-4 mr-2" />
                Send Snap
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
