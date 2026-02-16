'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeCard } from './EmployeeCard';
import { DeleteEmployeeModal } from './DeleteEmployeeModal';
import { CreateEmployeeForm } from './CreateEmployeeForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { UserPlus, Search, Filter, Loader2, Users, Edit2, Trash2 } from 'lucide-react';
import { EmployeeListItem } from '@/lib/types/employee';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { deleteEmployee, getEmployeeById, type EmployeeDetail } from '@/lib/api/employees';
import { useToast } from '@/lib/hooks/useToast';
import { PaginationMetadata } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface EmployeesListProps {
  employees: EmployeeListItem[];
  user?: AuthenticatedUser | null;
  userRole?: string;
  pagination?: PaginationMetadata | null;
  searchQuery: string;
  roleFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  onRefresh?: () => void;
}

type ViewMode = 'list' | 'create' | 'edit';

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  hr: 'HR',
};

export function EmployeesList({
  employees: initialEmployees,
  user,
  userRole,
  pagination,
  searchQuery,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
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

  const isHR = userRole === 'hr';

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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-semibold">
              {viewMode === 'edit' ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'edit' ? 'Update employee information' : 'Add a new team member to the directory'}
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            setViewMode('list');
            setSelectedEmployeeId(null);
            setEditingEmployee(null);
          }}>
            Back to Directory
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
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-semibold" data-testid="text-directory-title">Directory</h2>
            <p className="text-muted-foreground mt-1">
              {pagination ? `${pagination.total} team members` : `${initialEmployees.length} team members`}
            </p>
          </div>
          {isHR && (
            <Button onClick={() => setViewMode('create')} data-testid="button-add-employee">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              data-testid="input-directory-search"
            />
          </div>
          <Select value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-role-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {initialEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No team members found</h3>
            <p className="text-muted-foreground">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Your team directory is empty'}
            </p>
            {isHR && !searchQuery && roleFilter === 'all' && (
              <Button onClick={() => setViewMode('create')} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Employee
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {initialEmployees.map((employee) => (
                <div key={employee.id} className="relative group">
                  <EmployeeCard employee={employee} />
                  {isHR && (
                    <div className="absolute top-2 right-2 flex gap-1 invisible group-hover:visible" data-testid={`admin-actions-${employee.id}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(employee.id);
                        }}
                        data-testid={`button-edit-${employee.id}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(employee.id);
                        }}
                        data-testid={`button-deactivate-${employee.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
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
          </>
        )}
      </div>

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
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading employee...</span>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
