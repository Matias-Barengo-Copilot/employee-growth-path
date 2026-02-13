import { getAuthenticatedUser } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { FileText, List, CheckCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dashboard Home Page
 * 
 * Displays role-based content and quick access to main features.
 * This is the landing page after user login.
 */
export default async function DashboardHomePage() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    redirect('/sign-in');
  }

  const { role, name } = user;

  // Quick action cards based on role
  const quickActions = [
    {
      title: 'Submit Leave Request',
      description: 'Create a new leave request',
      href: '/leave-requests/submit',
      icon: FileText,
      roles: ['employee', 'supervisor'],
    },
    {
      title: 'My Requests',
      description: 'View your leave requests',
      href: '/requests/my-requests',
      icon: List,
      roles: ['employee', 'supervisor'],
    },
    {
      title: 'Leave Approvals',
      description: 'Review and approve leave requests',
      href: '/requests/all-requests',
      icon: CheckCircle,
      roles: ['supervisor', 'hr'],
    },
    {
      title: 'Members',
      description: 'Manage members in your organization',
      href: '/employees',
      icon: UserPlus,
      roles: ['hr'],
    },
  ].filter((action) => action.roles.includes(role));

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {name}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your leave requests and approvals from here.
        </p>
      </div>

      {/* Quick Actions - Hidden for HR */}
      {role !== 'hr' && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            Quick Actions
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card key={action.href} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-slate-600" />
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={action.href}>
                      <Button className="w-full">Go to {action.title}</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Role-specific content */}
      {role === 'employee' && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Start by submitting a leave request or viewing your existing requests.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {(role === 'supervisor' || role === 'hr') && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              You have requests waiting for your approval. Review them in the Leave Approvals section.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {role === 'hr' && (
        <Card>
          <CardHeader>
            <CardTitle>HR Dashboard</CardTitle>
            <CardDescription>
              Manage members, review all leave requests, and configure system settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

