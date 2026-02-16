'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  FileText, 
  ArrowLeft,
  XCircle,
  User,
} from 'lucide-react';
import { ApprovalHistory } from './ApprovalHistory';
import { ApprovalActions } from './ApprovalActions';
import { withdrawLeaveRequest } from '@/lib/api/leave-requests';
import { Loader2 } from 'lucide-react';
import { formatLocalDate } from '@/lib/utils/date';
import { canWithdrawLeaveRequest } from '@/lib/utils/leave-request';
import { useToast } from '@/lib/hooks/useToast';

import { LeaveRequestListItem } from './LeaveRequestsList';

interface LeaveRequestDetailProps {
  user: AuthenticatedUser;
  leaveRequest: LeaveRequestListItem;
}

/**
 * Leave Request Detail Component
 * Shows complete details of a leave request with approval history and actions
 */
export function LeaveRequestDetail({ user, leaveRequest }: LeaveRequestDetailProps) {
  const router = useRouter();
  const toast = useToast();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacation':
        return 'Vacation Leave';
      case 'personal_sick':
        return 'Personal/Sick Leave';
      case 'unpaid':
        return 'Unpaid Leave';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Check if withdraw is allowed using shared utility function
  const canWithdraw = () => {
    // Transform approvals to match expected type
    const transformedApprovals = leaveRequest.approvals?.map(approval => ({
      approverRole: approval.approverRole as 'hr' | 'pm' | 'tech_lead' | 'supervisor',
      status: approval.status as 'pending' | 'approved' | 'rejected',
    }));
    return canWithdrawLeaveRequest({
      overallStatus: leaveRequest.overallStatus,
      approvals: transformedApprovals,
    });
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this leave request? This action cannot be undone.')) {
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await withdrawLeaveRequest(leaveRequest.id);
      if (response.success) {
        toast.success('Success', 'Leave request withdrawn successfully');
        router.push('/requests/my-requests');
      }
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to withdraw leave request');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const isOwner = leaveRequest.employeeId === user.employeeId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leave Request Details</h1>
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(leaveRequest.overallStatus)} className="text-lg px-4 py-2">
          {getStatusLabel(leaveRequest.overallStatus)}
        </Badge>
      </div>

      {/* Member Information */}
      {leaveRequest.employee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Member Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{leaveRequest.employee.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{leaveRequest.employee.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">{leaveRequest.employee.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Leave Type</p>
                <p className="text-sm font-medium">{getLeaveTypeLabel(leaveRequest.leaveType)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Days</p>
                <p className="text-sm font-medium">
                  {leaveRequest.totalWorkingDays 
                    ? `${leaveRequest.totalWorkingDays} ${leaveRequest.totalWorkingDays === 1 ? 'day' : 'days'}`
                    : `${leaveRequest.totalDays || 0} ${leaveRequest.totalDays === 1 ? 'day' : 'days'}`
                  }
                </p>
              </div>
              {leaveRequest.leaveDays && leaveRequest.leaveDays.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">Selected Days</p>
                  <div className="space-y-2">
                    {leaveRequest.leaveDays.map((day) => (
                      <div key={day.id || day.date} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                        <Badge variant="outline" className="text-xs">
                          {day.leaveType === 'vacation' ? 'Vacation' : 
                            day.leaveType === 'personal_sick' ? 'Personal/Sick' : 
                            day.leaveType === 'unpaid' ? 'Unpaid' : 'Other'}
                        </Badge>
                        <span className="text-sm font-medium">{formatDate(day.date)}</span>
                        {day.isHalfDay && (
                          <Badge variant="secondary" className="text-xs">
                            {day.halfDayPeriod === 'morning' ? 'AM' : 'PM'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          {leaveRequest.reason && (
            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="text-sm font-medium">{leaveRequest.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      {leaveRequest.projects && leaveRequest.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Affected Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaveRequest.projects?.map((project) => (
                <Card key={project.id} className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{project.projectName || 'Unknown Project'}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {project.pm && (
                            <span>
                              PM: {project.pm.name} ({project.pm.email})
                            </span>
                          )}
                          {project.techLead && (
                            <span>
                              Tech Lead: {project.techLead.name} ({project.techLead.email})
                            </span>
                          )}
                          {!project.pm && !project.techLead && (
                            <span className="text-muted-foreground">No PM or Tech Lead assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {leaveRequest.approvals && leaveRequest.approvals.length > 0 && (
        <ApprovalHistory approvals={leaveRequest.approvals} />
      )}

      {/* Actions */}
      <div className="flex justify-between items-center gap-4">
        {isOwner && canWithdraw() && (
          <Button
            variant="destructive"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Withdrawing...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Withdraw Request
              </>
            )}
          </Button>
        )}
        <div className="flex gap-4 ml-auto">
          {isOwner ? (
            <Button
              variant="outline"
              onClick={() => router.push('/requests/my-requests')}
            >
              Back to My Requests
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push('/requests/all-requests')}
            >
              Back to All Requests
            </Button>
          )}
          {/* Approval Actions - only show if user can approve */}
          {!isOwner && (
            <ApprovalActions
              leaveRequest={leaveRequest}
              user={user}
              onActionComplete={() => router.refresh()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

