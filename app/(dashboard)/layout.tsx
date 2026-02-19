import { DashboardLayout } from '@/components/dashboard/layout/DashboardLayout';
import { getAuthenticatedUser, AuthenticatedUser } from '@/lib/middleware/auth';
import { getSession } from '@/lib/auth/session';
import { canViewAllLeaveRequests } from '@/lib/utils/view-all-leave-requests';
import { redirect } from 'next/navigation';

/**
 * Dashboard layout wrapper for Next.js App Router
 * Fetches authenticated user server-side and wraps all dashboard pages
 *
 * This layout:
 * - Verifies authentication with NextAuth
 * - Detects and creates initial admin if needed
 * - Verifies user exists in database
 * - Handles authentication errors (redirects to sign-in)
 * - Passes user data to DashboardLayout component
 */
export const dynamic = 'force-dynamic';

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Verificar autenticación con NextAuth
    const session = await getSession();

    if (!session?.user?.email) {
      redirect('/sign-in');
    }

    // Get complete user data for the layout
    const user: AuthenticatedUser = await getAuthenticatedUser();
    const canViewAll = canViewAllLeaveRequests(user);

    return (
      <DashboardLayout user={user} canViewAllLeaveRequests={canViewAll}>
        {children}
      </DashboardLayout>
    );
  } catch (error) {
    // Si hay error, redirigir a sign-in
    console.error('Error in dashboard layout:', error);
    redirect('/sign-in');
  }
}

