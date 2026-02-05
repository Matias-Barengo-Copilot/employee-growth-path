import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Sparkles,
  Target,
  MessageSquare,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import type { Employee, Activity } from "@shared/schema";

interface EnrichedActivity extends Activity {
  actor?: Employee;
  target?: Employee;
  parsedMetadata: Record<string, unknown>;
}

interface ActivitiesResponse {
  activities: EnrichedActivity[];
}

const activityConfig: Record<string, {
  icon: typeof Sparkles;
  color: string;
  bgColor: string;
  label: string;
}> = {
  snap_sent: {
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    label: "gave a snap to",
  },
  goal_created: {
    icon: Target,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    label: "created a new goal",
  },
  goal_completed: {
    icon: CheckCircle2,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    label: "completed a goal",
  },
  feedback_given: {
    icon: MessageSquare,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    label: "shared feedback with",
  },
  feedback_requested: {
    icon: Send,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
    label: "requested feedback from",
  },
  profile_updated: {
    icon: UserCheck,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500/10",
    label: "updated their profile",
  },
  member_joined: {
    icon: UserPlus,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "joined the team",
  },
};

function ActivityItem({ activity }: { activity: EnrichedActivity }) {
  const config = activityConfig[activity.type] || activityConfig.member_joined;
  const Icon = config.icon;
  const meta = activity.parsedMetadata || {};
  const actorName = activity.actor
    ? `${activity.actor.firstName} ${activity.actor.lastName}`
    : "Someone";
  const actorInitials = activity.actor
    ? `${activity.actor.firstName?.[0] || ""}${activity.actor.lastName?.[0] || ""}`.toUpperCase()
    : "?";

  const getDescription = () => {
    switch (activity.type) {
      case "snap_sent":
        return (
          <span>
            {config.label}{" "}
            <span className="font-medium">{(meta.recipientName as string) || "a teammate"}</span>
          </span>
        );
      case "goal_created":
        return (
          <span>
            {config.label}:{" "}
            <span className="font-medium">{(meta.goalTitle as string) || "Untitled"}</span>
          </span>
        );
      case "goal_completed":
        return (
          <span>
            {config.label}:{" "}
            <span className="font-medium">{(meta.goalTitle as string) || "Untitled"}</span>
          </span>
        );
      case "feedback_given":
        if (meta.isAnonymous) {
          return <span>shared anonymous feedback with a teammate</span>;
        }
        return (
          <span>
            {config.label}{" "}
            <span className="font-medium">{(meta.recipientName as string) || "a teammate"}</span>
          </span>
        );
      case "feedback_requested":
        return (
          <span>
            {config.label}{" "}
            <span className="font-medium">{(meta.responderName as string) || "a teammate"}</span>
          </span>
        );
      case "profile_updated":
        return <span>{config.label}</span>;
      case "member_joined":
        return <span>{config.label}</span>;
      default:
        return <span>{config.label}</span>;
    }
  };

  const timeAgo = activity.createdAt
    ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
    : "";

  return (
    <div className="flex items-start gap-3 py-3" data-testid={`activity-item-${activity.id}`}>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={activity.actor?.profileImageUrl || undefined} alt={actorName} />
        <AvatarFallback className="bg-muted text-xs font-medium">{actorInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-muted-foreground">{getDescription()}</span>
        </p>
        {activity.type === "goal_created" && meta.category ? (
          <Badge variant="secondary" className="text-xs">
            {String(meta.category)}
          </Badge>
        ) : null}
        {activity.type === "snap_sent" && Array.isArray(meta.tags) ? (
          <div className="flex flex-wrap gap-1">
            {(meta.tags as string[]).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const { data, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ["/api/activities"],
  });

  const activities = data?.activities || [];

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader title="Activity" description="What's happening across the team" />
        <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader title="Activity" description="What's happening across the team" />

      <div className="p-4 lg:p-6 max-w-2xl">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No activity yet</p>
              <p className="text-xs text-muted-foreground">
                Activity will appear here as your team uses the app
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-2">
              <div className="divide-y" data-testid="activity-feed">
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
