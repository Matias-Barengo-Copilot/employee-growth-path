import { getAuthenticatedUser, requireRole } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

/**
 * Slack Settings Page
 * HR only - Configure Slack integration and notifications
 */
export default async function SlackSettingsPage() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    redirect('/sign-in');
  }

  // Require HR role
  requireRole(user, ['hr']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Slack Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure Slack integration and notification settings
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            This section is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              The Slack integration settings page is currently being developed.
              You will be able to configure Slack channels, webhooks, and notification preferences here.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Planned features:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Slack channel configuration</li>
                <li>Webhook URL management</li>
                <li>Notification preferences</li>
                <li>Test notification functionality</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
