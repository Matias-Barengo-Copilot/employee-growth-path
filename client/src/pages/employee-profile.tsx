import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, 
  Mail, 
  MessageSquare, 
  MapPin, 
  Clock,
  Cake,
  Sparkles,
  Target,
  Send
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { GoalCard } from "@/components/goal-card";
import { SnapCard } from "@/components/snap-card";
import { EmptyState } from "@/components/empty-state";
import type { Employee, Team, Goal, Snap } from "@shared/schema";

interface ProfileData {
  employee: Employee;
  team: Team | null;
  manager: Employee | null;
  goals: Goal[];
  snapsReceived: Array<Snap & { sender?: Employee }>;
  isCurrentUser: boolean;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/employees", id],
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader title="Profile" />
        <div className="p-4 lg:p-6 space-y-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data?.employee) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader title="Profile" />
        <EmptyState
          icon={MessageSquare}
          title="Employee not found"
          description="This profile doesn't exist or you don't have access."
          action={{ label: "Back to Directory", onClick: () => window.history.back() }}
        />
      </div>
    );
  }

  const { employee, team, manager, goals, snapsReceived, isCurrentUser } = data;
  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase();
  const publicGoals = goals.filter(g => g.visibility === "team");

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Profile"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/directory">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        }
      />
      
      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                <AvatarImage 
                  src={employee.profileImageUrl || undefined} 
                  alt={`${employee.firstName} ${employee.lastName}`} 
                />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold" data-testid="text-profile-name">
                      {employee.firstName} {employee.lastName}
                    </h2>
                    <p className="text-muted-foreground">{employee.title || "Team Member"}</p>
                  </div>
                  
                  {!isCurrentUser && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/snaps?recipient=${employee.id}`}>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Give Snap
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/feedback?recipient=${employee.id}`}>
                          <Send className="h-4 w-4 mr-1" />
                          Give Feedback
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  {team && (
                    <Badge variant="secondary">{team.name}</Badge>
                  )}
                  {employee.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{employee.location}</span>
                    </div>
                  )}
                  {employee.timezone && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{employee.timezone}</span>
                    </div>
                  )}
                  {employee.dateOfBirth && isValid(parseISO(employee.dateOfBirth)) && (
                    <div className="flex items-center gap-1">
                      <Cake className="h-4 w-4" />
                      <span>{format(parseISO(employee.dateOfBirth), "MMMM d")}</span>
                    </div>
                  )}
                  {employee.email && (
                    <a 
                      href={`mailto:${employee.email}`} 
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{employee.email}</span>
                    </a>
                  )}
                  {employee.slackHandle && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>@{employee.slackHandle}</span>
                    </div>
                  )}
                </div>
                
                {employee.whatIDo && (
                  <p className="text-sm mb-4">{employee.whatIDo}</p>
                )}
                
                {manager && (
                  <p className="text-sm text-muted-foreground">
                    Reports to{" "}
                    <Link 
                      href={`/directory/${manager.id}`}
                      className="text-primary hover:underline"
                    >
                      {manager.firstName} {manager.lastName}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {employee.strengths && employee.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {employee.strengths.map((strength) => (
                    <Badge key={strength} variant="secondary">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {employee.workingPreferences && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Working Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {employee.workingPreferences}
                </p>
              </CardContent>
            </Card>
          )}
          
          {employee.funFacts && employee.funFacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fun Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {employee.funFacts.map((fact, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="goals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="goals" data-testid="tab-goals">
              <Target className="h-4 w-4 mr-1" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="recognition" data-testid="tab-recognition">
              <Sparkles className="h-4 w-4 mr-1" />
              Recognition
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="goals" className="space-y-4">
            {publicGoals.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No public goals"
                description={isCurrentUser 
                  ? "Create a goal and set visibility to 'Team' to show it here"
                  : "This person hasn't shared any public goals yet"
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {publicGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recognition" className="space-y-4">
            {snapsReceived.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No recognition yet"
                description={isCurrentUser 
                  ? "When you receive snaps, they'll appear here"
                  : "Be the first to recognize this person!"
                }
                action={!isCurrentUser ? {
                  label: "Give a Snap",
                  onClick: () => window.location.href = `/snaps?recipient=${employee.id}`
                } : undefined}
              />
            ) : (
              <div className="space-y-4">
                {snapsReceived.map((snap) => (
                  <SnapCard
                    key={snap.id}
                    snap={snap}
                    sender={snap.sender}
                    showRecipient={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
