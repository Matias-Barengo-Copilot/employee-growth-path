'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getLeaveTotals, getLeaveRequests } from '@/lib/api/leave-requests';
import { LeaveRequestsList } from '@/components/shared/leave-request/LeaveRequestsList';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { usePagination } from '@/lib/hooks/usePagination';
import { transformLeaveRequestDatesSimple, type LeaveRequestInput } from '@/lib/utils/date';
import { LeaveRequestListItem } from '@/components/shared/leave-request/LeaveRequestsList';
import { PaginationMetadata } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function LeaveHistoryByEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const employeeId = typeof params.employeeId === 'string' ? params.employeeId : '';

  const { page, limit, handlePageChange, handleItemsPerPageChange } = usePagination({
    defaultPage: 1,
    defaultLimit: 20,
  });

  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [totalsRes, requestsRes] = await Promise.all([
          getLeaveTotals(),
          getLeaveRequests({ employeeId, page, limit }),
        ]);

        if (!totalsRes.success || !totalsRes.data) {
          setError(totalsRes.error?.message ?? 'Failed to load');
          return;
        }

        const employeeRow = totalsRes.data.find((r) => r.employeeId === employeeId);
        if (employeeRow) setEmployeeName(employeeRow.name);

        if (requestsRes.success && requestsRes.data?.data) {
          const transformed = requestsRes.data.data.map((req: unknown) =>
            transformLeaveRequestDatesSimple(req as LeaveRequestInput)
          ) as LeaveRequestListItem[];
          setLeaveRequests(transformed);
          setPagination(requestsRes.data.pagination ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('Only HR') || msg.includes('leave totals access') || msg.includes('view your own')) {
          router.push('/leaves-total');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [employeeId, page, limit, router]);

  if (!employeeId) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Invalid employee.</p>
        <Link href="/leaves-total" className="text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Leaves total
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link href="/leaves-total" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Leaves total
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave history</h1>
          <p className="text-muted-foreground mt-2">Loading…</p>
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
        <Link href="/leaves-total" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Leaves total
        </Link>
        <Card>
          <CardContent className="py-12">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = employeeName ? `Leave history: ${employeeName}` : 'Leave history';

  return (
    <div className="space-y-6">
      <Link href="/leaves-total" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to Leaves total
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">All leave requests for this employee.</p>
      </div>

      <LeaveRequestsList
        leaveRequests={leaveRequests}
        user={session?.user?.employeeId ? {
          employeeId: session.user.employeeId,
          role: session.user.role ?? 'employee',
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
