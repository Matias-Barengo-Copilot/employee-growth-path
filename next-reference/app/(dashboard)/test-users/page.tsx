import { getAuthenticatedUser, requireRole } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { CreateTestUserForm } from '@/components/shared/test-users/CreateTestUserForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { isTestModeEnabledServer } from '@/lib/utils/test-mode';

export default async function TestUsersPage() {
  if (!isTestModeEnabledServer()) redirect('/');
  let user;
  try {
    user = await getAuthenticatedUser();
    requireRole(user, ['hr']);
  } catch {
    redirect('/sign-in');
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Users</h1>
        <p className="text-muted-foreground mt-2">Create test users with any email domain for testing purposes.</p>
      </div>
      <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">Test Mode Enabled</AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">This feature is only available in test mode. Test users can sign in directly without Google OAuth using their email address.</AlertDescription>
      </Alert>
      <CreateTestUserForm user={user} />
    </div>
  );
}

