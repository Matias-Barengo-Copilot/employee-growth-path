'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LeaveRequestsList } from '@/components/shared/leave-request/LeaveRequestsList';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { FilterBar } from '@/components/shared/filters/FilterBar';
import { getLeaveRequests } from '@/lib/api/leave-requests';
import { usePagination } from '@/lib/hooks/usePagination';
import { transformLeaveRequestDatesSimple, type LeaveRequestInput } from '@/lib/utils/date';
import { LeaveRequestListItem } from '@/components/shared/leave-request/LeaveRequestsList';
import { PaginationMetadata } from '@/lib/types';
import { allLeaveRequestsFilters } from '@/lib/config/filters';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export type LeaveRequestsViewScope = 'approvals' | 'all';

interface LeaveRequestsListPageContentProps {
  /** Determines API scope: approvals = only requests for user as supervisor, all = company-wide (for view-all/HR) */
  view: LeaveRequestsViewScope;
  pageTitle: string;
  pageDescription: string;
}

/**
 * Shared content for leave requests list pages (approvals and all-requests).
 * Uses distinct routes so the sidebar can highlight the correct tab by pathname.
 */
export function LeaveRequestsListPageContent({
  view,
  pageTitle,
  pageDescription,
}: LeaveRequestsListPageContentProps) {
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
    const fetchLeaveRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getLeaveRequests({
          status: searchParams.get('status') || undefined,
          leaveType: searchParams.get('leaveType') || undefined,
          fromDate: searchParams.get('fromDate') || undefined,
          toDate: searchParams.get('toDate') || undefined,
          employeeId: searchParams.get('employeeId') || undefined,
          view,
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
  }, [view, page, limit, searchParams]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground mt-2">{pageDescription}</p>
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
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground mt-2">{pageDescription}</p>
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
        <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{pageDescription}</p>
      </div>

      <FilterBar
        filters={allLeaveRequestsFilters}
        userRole={session?.user?.role}
      />

      <LeaveRequestsList
        leaveRequests={leaveRequests}
        user={session?.user?.employeeId ? {
          employeeId: session.user.employeeId,
          role: session.user.role ?? 'employee' as const,
          companyId: session.user.companyId ?? '',
          email: session.user.email ?? '',
          name: session.user.name ?? '',
        } : null}
        showEmployeeInfo={true}
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
