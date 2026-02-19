'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeCard } from './EmployeeCard';
import { DeleteEmployeeModal } from './DeleteEmployeeModal';
import { CreateEmployeeForm } from './CreateEmployeeForm';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterAutocomplete } from '@/components/shared/filters/FilterAutocomplete';
import { Pagination } from '@/components/shared/pagination/Pagination';
import { UserPlus, Filter, Loader2, Users, Edit2, Trash2 } from 'lucide-react';
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
  selectedMemberId: string;
  roleFilter: string;
  onMemberSelect: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  onRefresh?: () => void;
}

type ViewMode = 'list' | 'create' | 'edit';

const roleLabels: Record<string, string> = {
  employee: 'Member',
  supervisor: 'Supervisor',
  hr: 'HR',
};

export function EmployeesList({
  employees: initialEmployees,
  user,
  userRole,
  pagination,
  selectedMemberId,
  roleFilter,
  onMemberSelect,
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
      toast.error('Error', error instanceof Error ? error.message : 'Failed to load member');
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
      toast.success('Success', 'Member deactivated successfully');
      setEmployeeToDelete(null);
      refresh();
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to deactivate member');
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
              {viewMode === 'edit' ? 'Edit Member' : 'Add New Member'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'edit' ? 'Update member information' : 'Add a new member to the directory'}
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
              Add Member
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <FilterAutocomplete
              config={{
                key: 'memberId',
                type: 'autocomplete',
                label: 'Member',
                placeholder: 'Search member...',
                fetchOptions: '/api/employees',
                optionLabel: (item: { id: string; name?: string; email?: string; [key: string]: unknown }) => {
                  const name = item.name || 'Unknown';
                  const email = item.email;
                  return email ? `${name} (${email})` : name;
                },
                optionValue: (item: { id: string; [key: string]: unknown }) => item.id,
              }}
              value={selectedMemberId}
              onChange={onMemberSelect}
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={onRoleFilterChange}
            disabled={!!selectedMemberId}
          >
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-role-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="employee">Member</SelectItem>
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
              {selectedMemberId || roleFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your team directory is empty'}
            </p>
            {isHR && !selectedMemberId && roleFilter === 'all' && (
              <Button onClick={() => setViewMode('create')} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Member
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
              <span>Loading member...</span>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
