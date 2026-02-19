import { AuthenticatedUser } from '@/lib/middleware/auth';
import { Sidebar } from '@/components/dashboard/sidebar/Sidebar';
import { Header } from '@/components/dashboard/header/Header';

interface DashboardLayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
  /** Authenticated user data from middleware */
  user: AuthenticatedUser;
  /** Whether user can view all company leave requests (e.g. company lead) */
  canViewAllLeaveRequests?: boolean;
}

/**
 * Main dashboard layout wrapper
 * Provides consistent structure for all dashboard pages
 * 
 * This is a Server Component for optimal performance.
 * It wraps all dashboard pages with:
 * - Sidebar navigation (role-based)
 * - Header with user info
 * - Main content area with proper spacing
 * 
 * @example
 * ```tsx
 * <DashboardLayout user={authenticatedUser}>
 *   <YourPageContent />
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({ children, user, canViewAllLeaveRequests = false }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dashboard-layout">
        {/* Sidebar - always rendered, handles own responsive behavior */}
        <Sidebar userRole={user.role} canViewAllLeaveRequests={canViewAllLeaveRequests} />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header - sticky at top */}
          <Header
            userName={user.name}
            userEmail={user.email}
            employeeId={user.employeeId}
          />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
    </div>
  );
}

