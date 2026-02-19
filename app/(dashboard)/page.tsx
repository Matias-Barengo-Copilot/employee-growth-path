import { getAuthenticatedUser } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/db/client';
import { goals, snaps, feedbackRequests, employees, careerPaths, activities } from '@/db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { Target, Zap, MessageSquare, TrendingUp, ArrowRight, Clock } from 'lucide-react';

function getLevelFromXp(seasonXp: number): { level: number; levelName: string } {
  if (seasonXp >= 150) return { level: 5, levelName: 'All-Star' };
  if (seasonXp >= 100) return { level: 4, levelName: 'Champion' };
  if (seasonXp >= 60) return { level: 3, levelName: 'Engaged' };
  if (seasonXp >= 25) return { level: 2, levelName: 'Contributor' };
  return { level: 1, levelName: 'Starter' };
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'success' | 'outline' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'on_track':
      return 'default';
    case 'at_risk':
      return 'destructive';
    case 'not_started':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function DashboardHomePage() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    redirect('/sign-in');
  }

  const now = new Date();

  const recentGoals = await db
    .select({
      id: goals.id,
      title: goals.title,
      status: goals.status,
      category: goals.category,
      progress: goals.progress,
      createdAt: goals.createdAt,
    })
    .from(goals)
    .where(
      and(
        eq(goals.employeeId, user.employeeId),
        eq(goals.companyId, user.companyId)
      )
    )
    .orderBy(desc(goals.createdAt))
    .limit(5);

  const recentSnaps = await db
    .select({
      id: snaps.id,
      senderId: snaps.senderId,
      message: snaps.message,
      tags: snaps.tags,
      createdAt: snaps.createdAt,
      senderName: employees.name,
    })
    .from(snaps)
    .innerJoin(employees, eq(snaps.senderId, employees.id))
    .where(
      and(
        eq(snaps.recipientId, user.employeeId),
        eq(snaps.companyId, user.companyId)
      )
    )
    .orderBy(desc(snaps.createdAt))
    .limit(5);

  const pendingFeedbackRequests = await db
    .select({
      id: feedbackRequests.id,
      requesterId: feedbackRequests.requesterId,
      prompt: feedbackRequests.prompt,
      deadline: feedbackRequests.deadline,
      createdAt: feedbackRequests.createdAt,
      requesterName: employees.name,
    })
    .from(feedbackRequests)
    .innerJoin(employees, eq(feedbackRequests.requesterId, employees.id))
    .where(
      and(
        eq(feedbackRequests.responderId, user.employeeId),
        eq(feedbackRequests.companyId, user.companyId),
        eq(feedbackRequests.status, 'pending')
      )
    )
    .orderBy(desc(feedbackRequests.createdAt));

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [activityCountResult] = await db
    .select({ count: count() })
    .from(activities)
    .where(
      and(
        eq(activities.companyId, user.companyId),
        eq(activities.actorId, user.employeeId),
        sql`${activities.createdAt} >= ${startOfWeek.toISOString()}`
      )
    );

  const [careerPath] = await db
    .select()
    .from(careerPaths)
    .where(
      and(
        eq(careerPaths.employeeId, user.employeeId),
        eq(careerPaths.companyId, user.companyId)
      )
    )
    .limit(1);

  const seasonXp = careerPath?.seasonXp ?? 0;
  const { levelName } = getLevelFromXp(seasonXp);
  const activityCount = activityCountResult?.count ?? 0;
  const activeGoalsCount = recentGoals.filter(
    (g) => g.status !== 'completed'
  ).length;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome">
          Welcome back, {user.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is what is happening across your workspace.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-active-goals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Goals
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-active-goals">
              {activeGoalsCount}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-xp-level">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              XP Level
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-xp-level">
              {levelName}
            </div>
            <p className="text-xs text-muted-foreground">{seasonXp} XP this season</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending-feedback">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Feedback
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-pending-feedback">
              {pendingFeedbackRequests.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-weekly-activity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Activity
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-weekly-activity">
              {activityCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card data-testid="section-recent-goals">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Recent Goals</CardTitle>
            <Link
              href="/goals"
              className="text-sm text-muted-foreground flex items-center gap-1"
              data-testid="link-view-all-goals"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals yet.</p>
            ) : (
              <div className="space-y-4">
                {recentGoals.map((goal) => (
                  <div key={goal.id} className="space-y-2" data-testid={`goal-item-${goal.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{goal.title}</p>
                      <Badge variant={getStatusVariant(goal.status)} className="shrink-0">
                        {formatStatus(goal.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${goal.progress}%` }}
                          data-testid={`progress-bar-${goal.id}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {goal.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="section-recent-snaps">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Recent Snaps</CardTitle>
            <Link
              href="/snaps"
              className="text-sm text-muted-foreground flex items-center gap-1"
              data-testid="link-view-all-snaps"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentSnaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recognition received yet.</p>
            ) : (
              <div className="space-y-4">
                {recentSnaps.map((snap) => (
                  <div key={snap.id} className="space-y-1" data-testid={`snap-item-${snap.id}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{snap.senderName}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(snap.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {snap.message}
                    </p>
                    {snap.tags && snap.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {snap.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="section-pending-feedback">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Pending Feedback</CardTitle>
            <Link
              href="/feedback"
              className="text-sm text-muted-foreground flex items-center gap-1"
              data-testid="link-view-all-feedback"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {pendingFeedbackRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending feedback requests.</p>
            ) : (
              <div className="space-y-4">
                {pendingFeedbackRequests.map((req) => (
                  <div key={req.id} className="space-y-1" data-testid={`feedback-item-${req.id}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{req.requesterName}</p>
                      {req.deadline && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(req.deadline)}
                        </span>
                      )}
                    </div>
                    {req.prompt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {req.prompt}
                      </p>
                    )}
                    <Link
                      href={`/feedback?respond=${req.id}`}
                      className="text-sm text-primary font-medium inline-flex items-center gap-1"
                      data-testid={`link-respond-feedback-${req.id}`}
                    >
                      Respond <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
