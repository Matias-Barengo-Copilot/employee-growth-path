'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { EmployeesList } from '@/components/shared/employees/EmployeesList';
import { getEmployeesPaginated } from '@/lib/api/employees';
import { EmployeeListItem } from '@/lib/types/employee';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationMetadata } from '@/lib/types';
import { employeesFilters } from '@/lib/config/filters';
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

  // Extract filter values to avoid infinite loops
  // Use searchParams.toString() for stable comparison
  const searchParamsString = searchParams.toString();
  const roleFilter = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get('role') || undefined;
  }, [searchParamsString]);
  const searchFilter = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get('search') || undefined;
  }, [searchParamsString]);

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getEmployeesPaginated({
        role: roleFilter,
        search: searchFilter,
        page,
        limit,
      });

      if (response.success && response.data) {
        setEmployees(response.data.data as EmployeeListItem[]);
        setPagination(response.data.pagination);
      } else {
        setError(response.error?.message || 'Failed to fetch employees');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Only HR')) {
        // Redirect if not HR
        router.push('/');
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // Note: router is stable and only used in catch block for error handling
    // It doesn't need to be in dependencies as it's a stable reference from useRouter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, roleFilter, searchFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Members</h2>
          <p className="text-muted-foreground mt-1">Manage all members in your organization</p>
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
          <h2 className="text-2xl font-semibold">Members</h2>
          <p className="text-muted-foreground mt-1">Manage all members in your organization</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert session user to AuthenticatedUser format
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
      filters={employeesFilters}
      userRole={session?.user?.role}
      pagination={pagination}
      onPageChange={handlePageChange}
      onItemsPerPageChange={handleItemsPerPageChange}
      onRefresh={fetchEmployees}
    />
  );
}
