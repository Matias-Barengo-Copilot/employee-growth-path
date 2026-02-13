'use client';

import { AuthenticatedUser } from '@/lib/middleware/auth';
import { LeaveRequestCard } from './LeaveRequestCard';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export interface LeaveRequestListItem {
  id: string;
  employeeId: string;
  leaveType: string;
  fromDate: string | null;
  toDate: string | null;
  totalDays: number;
  totalWorkingDays?: number | null;
  totalHalfDays?: string | null;
  reason: string | null;
  overallStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
  leaveDays?: Array<{
    id: string;
    date: string | null;
    leaveType: string;
    isHalfDay: boolean;
    halfDayPeriod?: string | null;
    createdAt?: string | null;
  }>;
  employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    country?: string;
    roleType?: 'employee' | 'individual_contractor';
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
    createdAt: string | null;
    approver?: {
      id: string;
      name: string;
      role: string;
    };
  }>;
}

interface LeaveRequestsListProps {
  leaveRequests: LeaveRequestListItem[];
  user?: AuthenticatedUser | null | undefined;
  showEmployeeInfo?: boolean;
}

/**
 * Leave Requests List Component
 * Displays a list of leave requests with filtering and sorting capabilities
 */
export function LeaveRequestsList({ 
  leaveRequests, 
  user,
  showEmployeeInfo = false 
}: LeaveRequestsListProps) {
  if (leaveRequests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No leave requests found
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {showEmployeeInfo 
              ? 'No leave requests match your filters.'
              : 'You haven\'t submitted any leave requests yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {leaveRequests.map((request) => (
        <LeaveRequestCard
          key={request.id}
          leaveRequest={request}
          user={user ?? undefined}
          showEmployeeInfo={showEmployeeInfo}
        />
      ))}
    </div>
  );
}

