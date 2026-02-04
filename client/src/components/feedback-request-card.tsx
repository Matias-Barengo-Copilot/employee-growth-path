import { formatDistanceToNow } from "date-fns";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FeedbackRequest, Employee } from "@shared/schema";

interface FeedbackRequestCardProps {
  request: FeedbackRequest;
  requester?: Employee | null;
  responder?: Employee | null;
  isIncoming?: boolean;
  onRespond?: (request: FeedbackRequest) => void;
}

export function FeedbackRequestCard({ 
  request, 
  requester, 
  responder,
  isIncoming = false,
  onRespond 
}: FeedbackRequestCardProps) {
  const person = isIncoming ? requester : responder;
  const initials = person 
    ? `${person.firstName?.[0] || ""}${person.lastName?.[0] || ""}`.toUpperCase() 
    : "?";

  const isPending = request.status === "pending";
  const isOverdue = request.deadline && new Date(request.deadline) < new Date() && isPending;

  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 ${isPending && isIncoming ? "border-primary/30" : ""}`}
      data-testid={`card-feedback-request-${request.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage 
              src={person?.profileImageUrl || undefined} 
              alt={person ? `${person.firstName} ${person.lastName}` : "Unknown"} 
            />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <span className="font-medium text-sm">
                  {isIncoming ? "From: " : "To: "}
                  {person ? `${person.firstName} ${person.lastName}` : "Unknown"}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={isPending ? "secondary" : "outline"}
                    className={`text-xs ${request.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}`}
                  >
                    {request.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {request.status === "completed" ? "Completed" : "Pending"}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
              
              {isIncoming && isPending && onRespond && (
                <Button 
                  size="sm" 
                  onClick={() => onRespond(request)}
                  data-testid={`button-respond-${request.id}`}
                >
                  Respond
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
            
            {request.prompt && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{request.prompt}"
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>
                Requested {request.createdAt && formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </span>
              {request.deadline && (
                <span>
                  Due {formatDistanceToNow(new Date(request.deadline), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
