'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { EmployeesList } from '@/components/shared/employees/EmployeesList';
import { getEmployeesPaginated, getEmployeeById } from '@/lib/api/employees';
import { EmployeeListItem } from '@/lib/types/employee';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationMetadata } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { page, limit, handlePageChange, handleItemsPerPageChange } = usePagination({
    defaultPage: 1,
    defaultLimit: 20,
  });

  const searchParamsString = searchParams.toString();
  const roleFilter = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get('role') || 'all';
  }, [searchParamsString]);
  const selectedMemberId = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get('memberId') || '';
  }, [searchParamsString]);

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedMemberId) {
        const member = await getEmployeeById(selectedMemberId);
        if (member) {
          setEmployees([member as EmployeeListItem]);
          setPagination({ total: 1, page: 1, limit: 1, totalPages: 1, hasNext: false, hasPrev: false });
        } else {
          setEmployees([]);
          setPagination(null);
        }
      } else {
        const response = await getEmployeesPaginated({
          role: roleFilter !== 'all' ? roleFilter : undefined,
          page,
          limit,
        });

        if (response.success && response.data) {
          setEmployees(response.data.data as EmployeeListItem[]);
          setPagination(response.data.pagination);
        } else {
          setError(response.error?.message || 'Failed to fetch members');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, roleFilter, selectedMemberId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleMemberSelect = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('memberId', value);
      params.delete('role');
    } else {
      params.delete('memberId');
    }
    params.delete('page');
    router.push(`/employees?${params.toString()}`);
  }, [router, searchParams]);

  const handleRoleFilterChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set('role', value);
    } else {
      params.delete('role');
    }
    params.delete('page');
    router.push(`/employees?${params.toString()}`);
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Directory</h2>
          <p className="text-muted-foreground mt-1">Your team members</p>
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
          <h2 className="text-2xl font-semibold">Directory</h2>
          <p className="text-muted-foreground mt-1">Your team members</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const authenticatedUser = session?.user?.employeeId ? {
    employeeId: session.user.employeeId,
    role: session.user.role ?? 'employee' as const,
    companyId: session.user.companyId ?? '',
    email: session.user.email ?? '',
    name: session.user.name ?? '',
  } : null;

  return (
    <EmployeesList
      employees={employees}
      user={authenticatedUser}
      userRole={session?.user?.role}
      pagination={pagination}
      selectedMemberId={selectedMemberId}
      roleFilter={roleFilter}
      onMemberSelect={handleMemberSelect}
      onRoleFilterChange={handleRoleFilterChange}
      onPageChange={handlePageChange}
      onItemsPerPageChange={handleItemsPerPageChange}
      onRefresh={fetchEmployees}
    />
  );
}
