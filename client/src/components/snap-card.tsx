import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SNAP_TAGS } from "@/lib/constants";
import type { Snap, Employee } from "@shared/schema";

interface SnapCardProps {
  snap: Snap;
  sender?: Employee | null;
  recipient?: Employee | null;
  showRecipient?: boolean;
}

export function SnapCard({ snap, sender, recipient, showRecipient = true }: SnapCardProps) {
  const senderInitials = sender 
    ? `${sender.firstName?.[0] || ""}${sender.lastName?.[0] || ""}`.toUpperCase() 
    : "?";
  const recipientInitials = recipient 
    ? `${recipient.firstName?.[0] || ""}${recipient.lastName?.[0] || ""}`.toUpperCase() 
    : "?";

  return (
    <Card className="overflow-hidden" data-testid={`card-snap-${snap.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={sender?.profileImageUrl || undefined} 
                alt={sender ? `${sender.firstName} ${sender.lastName}` : "Unknown"} 
              />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {senderInitials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">
                {sender ? `${sender.firstName} ${sender.lastName}` : "Someone"}
              </span>
              {showRecipient && recipient && (
                <>
                  <span className="text-muted-foreground text-xs">gave a snap to</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage 
                        src={recipient.profileImageUrl || undefined} 
                        alt={`${recipient.firstName} ${recipient.lastName}`} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                        {recipientInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">
                      {recipient.firstName} {recipient.lastName}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">
              {snap.message}
            </p>
            
            {snap.tags && snap.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {snap.tags.map((tag) => {
                  const tagConfig = SNAP_TAGS.find(t => t.value === tag);
                  return (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className={`text-xs ${tagConfig?.color || ""}`}
                    >
                      {tagConfig?.label || tag}
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {snap.createdAt && formatDistanceToNow(new Date(snap.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
