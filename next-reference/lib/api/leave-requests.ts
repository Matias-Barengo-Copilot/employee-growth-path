import { LeaveRequestListItem } from '@/components/shared/leave-request/LeaveRequestsList';

// Frontend input type - allows optional pmId and techLeadId
// Backend will validate and return errors if they're missing
export interface SubmitLeaveRequestInputFrontend {
  leaveDays: Array<{
    date: string;
    leaveType: 'vacation' | 'personal_sick' | 'unpaid' | 'other';
    isHalfDay: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
  }>;
  reason?: string;
  projects: Array<{
    projectName: string;
    pmId?: string;
    techLeadId?: string;
  }>;
}

export interface SubmitLeaveRequestResponse {
  success: boolean;
  data: {
    id: string;
    employeeId: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    overallStatus: string;
    reason: string | null;
    createdAt: string;
    updatedAt: string;
    employee?: {
      id: string;
      name: string;
      email: string;
      role: string;
      companyId: string;
    };
    projects?: Array<{
      id: string;
      projectName: string;
      pmId?: string | null;
      techLeadId?: string | null;
      pm?: {
        id: string;
        name: string;
        email: string;
      } | null;
      techLead?: {
        id: string;
        name: string;
        email: string;
      } | null;
    }>;
    approvals?: Array<{
      id: string;
      approverId: string;
      approverRole: string;
      status: string;
      comments: string | null;
      decidedAt: string | null;
      createdAt: string;
      approver?: {
        id: string;
        name: string;
        role: string;
      };
    }>;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Enviar solicitud de licencia
 * 
 * @param data - Datos de la solicitud de licencia
 * @returns Respuesta de la API con la solicitud creada
 * @throws Error si la solicitud falla
 */
export interface ApiValidationError {
  error?: {
    message?: string;
    code?: string;
    errors?: Array<{
      path: string;
      message: string;
    }>;
  };
}

export interface LeaveDaysAvailedSummary {
  vacation: number;
  personal: number;
}

export interface LeaveDaysAvailedSummaryResponse {
  success: boolean;
  data: LeaveDaysAvailedSummary;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Get leave days availed summary for an employee
 * 
 * @param employeeId - Optional employee ID (defaults to current user)
 * @returns Summary of vacation and personal leave days availed
 */
export async function getLeaveDaysAvailedSummary(
  employeeId?: string
): Promise<LeaveDaysAvailedSummaryResponse> {
  const url = employeeId 
    ? `/api/leave-requests/summary?employeeId=${employeeId}`
    : '/api/leave-requests/summary';
    
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      data: { vacation: 0, personal: 0 },
      error: {
        message: data.error?.message || 'Failed to fetch leave summary',
        code: data.error?.code,
      },
    };
  }

  return {
    success: true,
    data: data.data || { vacation: 0, personal: 0 },
  };
}

export async function submitLeaveRequest(
  data: SubmitLeaveRequestInputFrontend
): Promise<SubmitLeaveRequestResponse> {
  const response = await fetch('/api/leave-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json() as ApiValidationError;
    
    // Create a custom error that includes validation errors
    const error = new Error(errorData.error?.message || 'Failed to submit leave request');
    const validationErrors = errorData.error?.errors;
    (error as Error & { validationErrors?: Array<{ path: string; message: string }> }).validationErrors = validationErrors;
    throw error;
  }

  return response.json() as Promise<SubmitLeaveRequestResponse>;
}

export interface WithdrawLeaveRequestResponse {
  success: boolean;
  data?: SubmitLeaveRequestResponse['data'];
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Withdraw a leave request
 * Only the requester can withdraw, and only before HR final approval
 * 
 * @param leaveRequestId - Leave request ID
 * @returns Response with updated leave request
 */
export async function withdrawLeaveRequest(
  leaveRequestId: string
): Promise<WithdrawLeaveRequestResponse> {
  const response = await fetch(`/api/leave-requests/${leaveRequestId}/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to withdraw leave request');
  }

  return response.json() as Promise<WithdrawLeaveRequestResponse>;
}

export interface Draft {
  id: string;
  employeeId: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  totalDays?: number;
  leaveDays?: Array<{
    date: string;
    leaveType: string;
    isHalfDay: boolean;
    halfDayPeriod?: string | null;
  }>;
  reason: string | null;
  overallStatus: string;
  createdAt: string;
  updatedAt: string;
  projects?: Array<{
    id: string;
    projectName: string;
    pmId?: string | null;
    techLeadId?: string | null;
    pm?: {
      id: string;
      name: string;
      email: string;
    } | null;
    techLead?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
}

export interface GetDraftsResponse {
  success: boolean;
  data?: Draft[];
  error?: {
    message: string;
    code?: string;
  };
}

export interface SaveDraftResponse {
  success: boolean;
  data?: Draft;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Get all drafts for the authenticated user
 */
export async function getDrafts(): Promise<GetDraftsResponse> {
  const response = await fetch('/api/leave-requests/draft', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to fetch drafts');
  }

  return response.json() as Promise<GetDraftsResponse>;
}

/**
 * Save a draft (create or update)
 */
export async function saveDraft(
  data: {
    leaveDays?: Array<{
      date: string;
      leaveType: string;
      isHalfDay: boolean;
      halfDayPeriod?: string | null;
    }>;
    reason?: string;
    projects?: Array<{
      projectName: string;
      pmId?: string;
      techLeadId?: string;
    }>;
  },
  draftId?: string
): Promise<SaveDraftResponse> {
  const url = draftId
    ? `/api/leave-requests/draft/${draftId}`
    : '/api/leave-requests/draft';
  const method = draftId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to save draft');
  }

  return response.json() as Promise<SaveDraftResponse>;
}

/**
 * Submit a draft (convert to pending leave request)
 */
export async function submitDraft(draftId: string): Promise<SubmitLeaveRequestResponse> {
  const response = await fetch(`/api/leave-requests/draft/${draftId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to submit draft');
  }

  return response.json() as Promise<SubmitLeaveRequestResponse>;
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: string): Promise<{ success: boolean; data?: { success: boolean } }> {
  const response = await fetch(`/api/leave-requests/draft/${draftId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to delete draft');
  }

  return response.json() as Promise<{ success: boolean; data?: { success: boolean } }>;
}

export interface GetLeaveRequestsParams {
  employeeId?: string;
  status?: string;
  companyId?: string;
  organizationId?: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  /** "approvals" = only requests that reach the user as supervisor; "all" = company-wide (for view-all/HR) */
  view?: 'approvals' | 'all';
  page?: number;
  limit?: number;
}

export interface GetLeaveRequestsResponse {
  success: boolean;
  data?: {
    data: LeaveRequestListItem[];
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
 * Get leave requests with pagination
 */
export async function getLeaveRequests(
  params: GetLeaveRequestsParams = {}
): Promise<GetLeaveRequestsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.employeeId) queryParams.set('employeeId', params.employeeId);
  if (params.status) queryParams.set('status', params.status);
  if (params.companyId) queryParams.set('companyId', params.companyId);
  if (params.organizationId) queryParams.set('organizationId', params.organizationId);
  if (params.leaveType) queryParams.set('leaveType', params.leaveType);
  if (params.fromDate) queryParams.set('fromDate', params.fromDate);
  if (params.toDate) queryParams.set('toDate', params.toDate);
  if (params.view) queryParams.set('view', params.view);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(`/api/leave-requests?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to fetch leave requests');
  }

  return response.json() as Promise<GetLeaveRequestsResponse>;
}

export interface LeaveTotalByEmployee {
  employeeId: string;
  name: string;
  email: string;
  personal_sick: number;
  vacation: number;
  unpaid: number;
  other: number;
  total: number;
}

export interface GetLeaveTotalsResponse {
  success: boolean;
  data?: LeaveTotalByEmployee[];
  error?: { message: string; code?: string };
}

/**
 * Get leave totals by employee for the current year (approved only).
 * Allowed: HR or users in VIEW_ALL_LEAVE_REQUESTS_EMAILS.
 */
export async function getLeaveTotals(): Promise<GetLeaveTotalsResponse> {
  const response = await fetch('/api/leave-requests/totals', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: { message: (data as { error?: { message?: string } }).error?.message || 'Failed to fetch leave totals' },
    };
  }
  return data as GetLeaveTotalsResponse;
}
