import { getAuthenticatedUser, requireRole } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Settings Page
 * HR only - Application settings management
 */
export default async function SettingsPage() {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage application settings and configurations
        </p>
      </div>

      {/* Settings Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Slack Settings Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Slack Integration
            </CardTitle>
            <CardDescription>
              Configure Slack notifications and automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage Slack channel settings, webhooks, and notification preferences.
              </p>
              <Link href="/settings/slack">
                <Button className="w-full" variant="outline">
                  Configure Slack Settings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* General Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Application-wide configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Coming Soon</h3>
              <p className="text-xs text-muted-foreground">
                General settings management is currently under development.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
