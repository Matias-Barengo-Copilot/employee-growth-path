/**
 * Utility functions for leave request operations
 */

export interface LeaveRequestApproval {
  approverRole: 'hr' | 'pm' | 'tech_lead' | 'supervisor';
  status: 'pending' | 'approved' | 'rejected';
}

export interface LeaveRequestForWithdrawCheck {
  overallStatus: string;
  approvals?: LeaveRequestApproval[];
}

/**
 * Determines if a leave request can be withdrawn
 * 
 * A leave request can be withdrawn if:
 * 1. Status is not 'cancelled' or 'approved'
 * 2. No approver (HR, PM, or Tech Lead) has approved yet
 * 
 * @param leaveRequest - The leave request to check
 * @returns true if the request can be withdrawn, false otherwise
 */
export function canWithdrawLeaveRequest(
  leaveRequest: LeaveRequestForWithdrawCheck
): boolean {
  // Cannot withdraw if already cancelled or approved
  if (leaveRequest.overallStatus === 'cancelled' || leaveRequest.overallStatus === 'approved') {
    return false;
  }

  // Check if any approver (HR, PM, or Tech Lead) has approved
  if (leaveRequest.approvals) {
    const requiredApproverRoles: Array<LeaveRequestApproval['approverRole']> = ['hr', 'pm', 'tech_lead'];
    const hasApproval = leaveRequest.approvals.some(
      (a) =>
        requiredApproverRoles.includes(a.approverRole) &&
        a.status === 'approved'
    );
    
    if (hasApproval) {
      return false;
    }
  }

  return true;
}
