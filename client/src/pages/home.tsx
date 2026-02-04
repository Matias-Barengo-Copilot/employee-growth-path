import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Target, 
  Sparkles, 
  MessageSquare, 
  Users,
  ArrowRight,
  TrendingUp,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { SnapCard } from "@/components/snap-card";
import type { Employee, Goal, Snap, FeedbackRequest } from "@shared/schema";

interface DashboardData {
  employee: Employee | null;
  goals: Goal[];
  recentSnaps: Array<Snap & { sender?: Employee; recipient?: Employee }>;
  pendingFeedbackRequests: FeedbackRequest[];
  stats: {
    totalGoals: number;
    completedGoals: number;
    snapsReceived: number;
    snapsGiven: number;
  };
}

export default function Home() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader title="Home" description="Welcome back" />
        <div className="p-4 lg:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const employee = data?.employee;
  const goals = data?.goals || [];
  const recentSnaps = data?.recentSnaps || [];
  const pendingRequests = data?.pendingFeedbackRequests || [];
  const stats = data?.stats || { totalGoals: 0, completedGoals: 0, snapsReceived: 0, snapsGiven: 0 };

  const activeGoals = goals.filter(g => g.status !== "completed");
  const goalProgress = stats.totalGoals > 0 
    ? Math.round((stats.completedGoals / stats.totalGoals) * 100) 
    : 0;

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title={employee ? `Welcome, ${employee.firstName}` : "Home"} 
        description="Your personal dashboard"
      />
      
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Goals Progress
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedGoals}/{stats.totalGoals}</div>
              <Progress value={goalProgress} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">
                {goalProgress}% complete
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Snaps Received
              </CardTitle>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.snapsReceived}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.snapsGiven} given
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Feedback requests waiting
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Goals
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGoals.length}</div>
              <p className="text-xs text-muted-foreground mt-2">
                In progress
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Your Goals</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/goals">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No active goals yet</p>
                  <Button size="sm" asChild>
                    <Link href="/goals">Create a Goal</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{goal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={goal.progress || 0} className="flex-1 h-1.5" />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {goal.progress || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Recent Snaps</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/snaps">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentSnaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No snaps yet</p>
                  <Button size="sm" asChild>
                    <Link href="/snaps">Give a Snap</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSnaps.slice(0, 2).map((snap) => (
                    <SnapCard
                      key={snap.id}
                      snap={snap}
                      sender={snap.sender}
                      recipient={snap.recipient}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/directory">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Directory</h3>
                  <p className="text-sm text-muted-foreground">Browse teammates</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/goals">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Goals</h3>
                  <p className="text-sm text-muted-foreground">Track progress</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/snaps">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Snaps</h3>
                  <p className="text-sm text-muted-foreground">Give recognition</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/feedback">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Feedback</h3>
                  <p className="text-sm text-muted-foreground">Share & request</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
