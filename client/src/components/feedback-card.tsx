import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FEEDBACK_TAGS } from "@/lib/constants";
import type { Feedback, Employee } from "@shared/schema";

interface FeedbackCardProps {
  feedback: Feedback;
  sender?: Employee | null;
  recipient?: Employee | null;
  showSender?: boolean;
  showRecipient?: boolean;
  onMarkAsRead?: (feedback: Feedback) => void;
}

export function FeedbackCard({ 
  feedback, 
  sender, 
  recipient,
  showSender = true,
  showRecipient = false,
  onMarkAsRead 
}: FeedbackCardProps) {
  const senderInitials = sender 
    ? `${sender.firstName?.[0] || ""}${sender.lastName?.[0] || ""}`.toUpperCase() 
    : "?";

  const displayName = feedback.isAnonymous 
    ? "Anonymous" 
    : (sender ? `${sender.firstName} ${sender.lastName}` : "Someone");

  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 ${!feedback.isRead ? "border-primary/30" : ""}`}
      data-testid={`card-feedback-${feedback.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {showSender && (
              <Avatar className="h-10 w-10">
                {feedback.isAnonymous ? (
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <EyeOff className="h-4 w-4" />
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage 
                      src={sender?.profileImageUrl || undefined} 
                      alt={displayName} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {senderInitials}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{displayName}</span>
                {feedback.isAnonymous && (
                  <Badge variant="outline" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Anonymous
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {feedback.createdAt && formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!feedback.isRead && onMarkAsRead && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onMarkAsRead(feedback)}
                data-testid={`button-mark-read-${feedback.id}`}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark as read
              </Button>
            )}
            {feedback.isRead && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Read
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {feedback.keepDoing && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium uppercase tracking-wider">Keep Doing</span>
            </div>
            <p className="text-sm pl-3.5 whitespace-pre-wrap">{feedback.keepDoing}</p>
          </div>
        )}
        
        {feedback.considerImproving && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium uppercase tracking-wider">Consider Improving</span>
            </div>
            <p className="text-sm pl-3.5 whitespace-pre-wrap">{feedback.considerImproving}</p>
          </div>
        )}
        
        {feedback.tags && feedback.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {feedback.tags.map((tag) => {
              const tagConfig = FEEDBACK_TAGS.find(t => t.value === tag);
              return (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tagConfig?.label || tag}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
