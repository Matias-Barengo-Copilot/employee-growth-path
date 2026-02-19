/**
 * Filter Configurations for Different Screens
 * Centralized filter definitions for reusability
 */

import { FilterConfig } from '@/lib/types/filters';

/**
 * Filters for My Leave Requests page
 */
export const myLeaveRequestsFilters: FilterConfig[] = [
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    placeholder: 'All statuses',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'draft', label: 'Draft' },
    ],
    allowClear: true,
  },
  {
    key: 'leaveType',
    type: 'select',
    label: 'Leave Type',
    placeholder: 'All types',
    options: [
      { value: 'vacation', label: 'Vacation' },
      { value: 'personal_sick', label: 'Personal/Sick' },
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'other', label: 'Other' },
    ],
    allowClear: true,
  },
  {
    key: 'dateRange',
    type: 'date-range',
    label: 'Date Range',
    placeholder: 'Select date range',
    fromKey: 'fromDate',
    toKey: 'toDate',
  },
];

/**
 * Filters for All Leave Requests page
 */
export const allLeaveRequestsFilters: FilterConfig[] = [
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    placeholder: 'All statuses',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'draft', label: 'Draft' },
    ],
    allowClear: true,
  },
  {
    key: 'leaveType',
    type: 'select',
    label: 'Leave Type',
    placeholder: 'All types',
    options: [
      { value: 'vacation', label: 'Vacation' },
      { value: 'personal_sick', label: 'Personal/Sick' },
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'other', label: 'Other' },
    ],
    allowClear: true,
  },
  {
    key: 'dateRange',
    type: 'date-range',
    label: 'Date Range',
    placeholder: 'Select date range',
    fromKey: 'fromDate',
    toKey: 'toDate',
  },
  {
    key: 'employeeId',
    type: 'autocomplete',
    label: 'Member',
    placeholder: 'Select member',
    visibleForRoles: ['hr'],
    fetchOptions: '/api/employees',
    optionLabel: (item: { id: string; name?: string; email?: string; [key: string]: unknown }) => {
      const name = item.name || 'Unknown';
      const email = item.email;
      return email ? `${name} (${email})` : name;
    },
    optionValue: (item: { id: string; [key: string]: unknown }) => item.id,
  },
];

/**
 * Filters for Employees page
 */
export const employeesFilters: FilterConfig[] = [
  {
    key: 'role',
    type: 'select-multi',
    label: 'Role',
    placeholder: 'All roles',
    options: [
      { value: 'employee', label: 'Member' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'hr', label: 'HR' },
    ],
    allowClear: true,
  },
  {
    key: 'search',
    type: 'text-search',
    label: 'Search',
    placeholder: 'Search by name or email...',
    debounceMs: 300,
  },
];
