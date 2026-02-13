'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeCard } from './EmployeeCard';
import { DeleteEmployeeModal } from './DeleteEmployeeModal';
import { CreateEmployeeForm } from './CreateEmployeeForm';
import { FilterBar } from '@/components/shared/filters/FilterBar';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import { EmployeeListItem } from '@/lib/types/employee';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { deleteEmployee, getEmployeeById, type EmployeeDetail } from '@/lib/api/employees';
import { useToast } from '@/lib/hooks/useToast';
import { FilterConfig } from '@/lib/types/filters';
import { PaginationMetadata } from '@/lib/types';

interface EmployeesListProps {
  employees: EmployeeListItem[];
  user?: AuthenticatedUser | null;
  filters?: FilterConfig[];
  userRole?: string;
  pagination?: PaginationMetadata | null;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  onRefresh?: () => void;
}

type ViewMode = 'list' | 'create' | 'edit';

export function EmployeesList({ 
  employees: initialEmployees, 
  user,
  filters,
  userRole,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  onRefresh,
}: EmployeesListProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDetail | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const toast = useToast();

  const refresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

  const handleEdit = async (id: string) => {
    setIsLoadingEmployee(true);
    try {
      const employee = await getEmployeeById(id);
      setEditingEmployee(employee);
      setSelectedEmployeeId(id);
      setViewMode('edit');
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to load employee');
    } finally {
      setIsLoadingEmployee(false);
    }
  };

  const handleDelete = (id: string) => {
    const employee = initialEmployees.find(e => e.id === id);
    if (employee) {
      setEmployeeToDelete(employee);
    }
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteEmployee(employeeToDelete.id);
      toast.success('Success', 'Employee deactivated successfully');
      setEmployeeToDelete(null);
      refresh();
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to deactivate employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuccess = () => {
    setViewMode('list');
    setSelectedEmployeeId(null);
    setEditingEmployee(null);
    refresh();
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {viewMode === 'edit' ? 'Edit Employee' : 'Create New Employee'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'edit' ? 'Update employee information' : 'Add a new employee to the system'}
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            setViewMode('list');
            setSelectedEmployeeId(null);
            setEditingEmployee(null);
          }}>
            Back to List
          </Button>
        </div>
        <CreateEmployeeForm
          user={user}
          employeeId={selectedEmployeeId || undefined}
          initialData={editingEmployee ? {
            name: editingEmployee.name,
            email: editingEmployee.email,
            country: editingEmployee.country,
            role: editingEmployee.role,
            roleType: editingEmployee.roleType || 'employee',
            joiningDate: editingEmployee.joiningDate || undefined,
            birthday: editingEmployee.birthday || undefined,
          } : undefined}
          onSuccess={handleSuccess}
          onCancel={() => {
            setViewMode('list');
            setSelectedEmployeeId(null);
            setEditingEmployee(null);
          }}
        />
      </div>
    );
  }

  return (
    <>
      {filters && (
        <FilterBar
          filters={filters}
          userRole={userRole}
        />
      )}
      
      <div className={filters ? 'mt-6' : ''}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Members</h2>
              <p className="text-muted-foreground mt-1">
                Manage all members in your organization
              </p>
            </div>
            <Button onClick={() => setViewMode('create')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create New Employee
            </Button>
          </div>

          {initialEmployees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No members found.</p>
              <Button onClick={() => setViewMode('create')} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                Create First Employee
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {initialEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {pagination && onPageChange && onItemsPerPageChange && (
        <div className="mt-6">
          <Pagination
            pagination={pagination}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
            showItemsPerPageSelector={true}
          />
        </div>
      )}

      {employeeToDelete && (
        <DeleteEmployeeModal
          open={!!employeeToDelete}
          employeeName={employeeToDelete.name}
          onConfirm={confirmDelete}
          onCancel={() => setEmployeeToDelete(null)}
          isDeleting={isDeleting}
        />
      )}

      {isLoadingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading employee...</span>
          </div>
        </div>
      )}
    </>
  );
}
