'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LeaveRequestsList } from '@/components/shared/leave-request/LeaveRequestsList';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { FilterBar } from '@/components/shared/filters/FilterBar';
import { getLeaveRequests } from '@/lib/api/leave-requests';
import { usePagination } from '@/lib/hooks/usePagination';
import { transformLeaveRequestDatesSimple, type LeaveRequestInput } from '@/lib/utils/date';
import { LeaveRequestListItem } from '@/components/shared/leave-request/LeaveRequestsList';
import { PaginationMetadata } from '@/lib/types';
import { myLeaveRequestsFilters } from '@/lib/config/filters';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * My Leave Requests Page
 * Shows all leave requests for the authenticated user
 * HR cannot access this page - they should use "All Requests" instead
 */
export default function MyLeaveRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { page, limit, handlePageChange, handleItemsPerPageChange } = usePagination({
    defaultPage: 1,
    defaultLimit: 20,
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // HR cannot access "My Requests" - redirect to "All Requests"
    if (session?.user?.role === 'hr') {
      router.push('/requests/all-requests');
      return;
    }

    const fetchLeaveRequests = async () => {
      if (!session?.user?.employeeId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await getLeaveRequests({
          employeeId: session.user.employeeId, // Always filter by authenticated user's employeeId for "My Requests"
          status: searchParams.get('status') || undefined,
          leaveType: searchParams.get('leaveType') || undefined,
          fromDate: searchParams.get('fromDate') || undefined,
          toDate: searchParams.get('toDate') || undefined,
          page,
          limit,
        });

        if (response.success && response.data) {
          const transformed = response.data.data.map((req: unknown) =>
            transformLeaveRequestDatesSimple(req as LeaveRequestInput)
          ) as LeaveRequestListItem[];
          setLeaveRequests(transformed);
          setPagination(response.data.pagination);
        } else {
          setError(response.error?.message || 'Failed to fetch leave requests');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaveRequests();
  }, [page, limit, searchParams, session?.user?.employeeId, session?.user?.role, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Leave Requests</h1>
          <p className="text-muted-foreground mt-2">View and manage your leave requests</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Leave Requests</h1>
          <p className="text-muted-foreground mt-2">View and manage your leave requests</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Leave Requests</h1>
        <p className="text-muted-foreground mt-2">View and manage your leave requests</p>
      </div>

      <FilterBar
        filters={myLeaveRequestsFilters}
        userRole={session?.user?.role}
      />

      {/* Convert session user to AuthenticatedUser format */}
      <LeaveRequestsList
        leaveRequests={leaveRequests}
        user={session?.user?.employeeId ? {
          employeeId: session.user.employeeId,
          role: session.user.role ?? 'employee' as const,
          companyId: session.user.companyId ?? '',
          email: session.user.email ?? '',
          name: session.user.name ?? '',
        } : null}
        showEmployeeInfo={false}
      />

      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          showItemsPerPageSelector={true}
        />
      )}
    </div>
  );
}
