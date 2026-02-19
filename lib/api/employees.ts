import type { EmployeeListItem } from '@/lib/types/employee';

// Re-export for convenience
export type { EmployeeListItem };

export interface EmployeeDetail {
  id: string;
  companyId: string;
  name: string;
  email: string;
  country: string;
  role: 'employee' | 'supervisor' | 'hr';
  roleType: 'employee' | 'individual_contractor';
  joiningDate: string | null;
  birthday: string | null;
  title: string | null;
  department: string | null;
  location: string | null;
  timezone: string | null;
  slackHandle: string | null;
  whatIDo: string | null;
  workingPreferences: string | null;
  currentlyWorkingOn: string | null;
  strengths: string[] | null;
  funFacts: string[] | null;
  profileImageUrl: string | null;
  usedVacationDays?: number;
  lastVacationResetDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    name: string;
    organizationId?: string;
  } | null;
}

export interface EmployeeResponse {
  success: boolean;
  data: EmployeeListItem[] | EmployeeDetail;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Get employees eligible to be PM or Tech Lead (roles: supervisor, hr)
 * @param companyId Optional company ID to filter by company
 */
export interface GetEmployeesParams {
  companyId?: string;
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetEmployeesPaginatedResponse {
  success: boolean;
  data?: {
    data: EmployeeListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Get employees with pagination
 */
export async function getEmployeesPaginated(
  params: GetEmployeesParams = {}
): Promise<GetEmployeesPaginatedResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.companyId) queryParams.set('companyId', params.companyId);
  if (params.role) queryParams.set('role', params.role);
  if (params.search) queryParams.set('search', params.search);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(`/api/employees?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch employees' } }));
    throw new Error(error.error?.message || error.message || 'Failed to fetch employees');
  }

  return response.json() as Promise<GetEmployeesPaginatedResponse>;
}

/**
 * Get employees (legacy, non-paginated)
 * @deprecated Use getEmployeesPaginated instead
 */
export async function getEmployees(): Promise<EmployeeListItem[]> {
  const response = await fetch('/api/employees', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch employees' } }));
    throw new Error(error.error?.message || error.message || 'Failed to fetch employees');
  }

  const result: EmployeeResponse = await response.json();
  
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error('Invalid response format');
  }

  return result.data as EmployeeListItem[];
}

export async function getEligibleEmployees(companyId?: string, excludeEmployeeId?: string): Promise<EmployeeListItem[]> {
  const url = new URL('/api/employees/eligible', window.location.origin);
  if (companyId) {
    url.searchParams.set('companyId', companyId);
  }
  if (excludeEmployeeId) {
    url.searchParams.set('excludeEmployeeId', excludeEmployeeId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch eligible employees' } }));
    throw new Error(error.error?.message || error.message || 'Failed to fetch eligible employees');
  }

  const result: EmployeeResponse = await response.json();
  
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error('Invalid response format');
  }

  return result.data as EmployeeListItem[];
}

export async function getEmployeeById(id: string): Promise<EmployeeDetail> {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch employee' } }));
    throw new Error(error.error?.message || error.message || 'Failed to fetch employee');
  }

  const result: EmployeeResponse = await response.json();
  
  if (!result.success || !result.data || typeof result.data === 'object' && !('id' in result.data)) {
    throw new Error('Invalid response format');
  }

  return result.data as EmployeeDetail;
}

export interface CreateEmployeeInput {
  companyId?: string;
  name: string;
  email: string;
  country: string;
  role: 'employee' | 'supervisor' | 'hr';
  roleType?: 'employee' | 'individual_contractor';
  joiningDate?: string;
  birthday?: string;
}

export interface CreateEmployeeResponse {
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Create a new employee and send invitation
 * The employee will be able to sign in with Google using their email
 */
export async function createEmployeeAndSendInvitation(
  data: CreateEmployeeInput
): Promise<CreateEmployeeResponse> {
  const response = await fetch('/api/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create employee' }));
    throw new Error(error.error?.message || error.message || 'Failed to create employee');
  }

  return response.json() as Promise<CreateEmployeeResponse>;
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  country?: string;
  role?: 'employee' | 'supervisor' | 'hr';
  roleType?: 'employee' | 'individual_contractor';
  joiningDate?: string;
  birthday?: string;
  title?: string | null;
  department?: string | null;
  location?: string | null;
  timezone?: string | null;
  slackHandle?: string | null;
  whatIDo?: string | null;
  workingPreferences?: string | null;
  currentlyWorkingOn?: string | null;
  strengths?: string[] | null;
  funFacts?: string[] | null;
  profileImageUrl?: string | null;
}

export interface UpdateEmployeeResponse {
  success: boolean;
  data?: EmployeeDetail;
  error?: {
    message: string;
    code?: string;
  };
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeInput
): Promise<UpdateEmployeeResponse> {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to update employee' } }));
    throw new Error(error.error?.message || error.message || 'Failed to update employee');
  }

  return response.json() as Promise<UpdateEmployeeResponse>;
}

export async function deleteEmployee(id: string): Promise<{ success: boolean; error?: { message: string } }> {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to delete employee' } }));
    throw new Error(error.error?.message || error.message || 'Failed to delete employee');
  }

  return response.json();
}
