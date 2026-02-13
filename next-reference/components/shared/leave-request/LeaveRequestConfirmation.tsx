'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Calendar, FileText, Users, Clock, ArrowLeft, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { withdrawLeaveRequest } from '@/lib/api/leave-requests';
import { formatLocalDate, parseLocalDate } from '@/lib/utils/date';
import { canWithdrawLeaveRequest } from '@/lib/utils/leave-request';
import { LeaveRequestListItem } from './LeaveRequestsList';
import { useToast } from '@/lib/hooks/useToast';

export interface LeaveRequestConfirmationProps {
  user: AuthenticatedUser;
  leaveRequest: LeaveRequestListItem & {
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
    leaveDays?: Array<{
      id: string;
      date: string;
      leaveType: string;
      isHalfDay: boolean;
      halfDayPeriod?: string | null;
    }>;
    totalWorkingDays?: number;
  };
}

/**
 * Leave Request Confirmation Component
 * Shows summary and current status after submitting a leave request
 */
export function LeaveRequestConfirmation({ user, leaveRequest }: LeaveRequestConfirmationProps) {
  const router = useRouter();
  const toast = useToast();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Check if withdraw is allowed
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
        // Refresh the page to show updated status
        router.refresh();
      }
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to withdraw leave request');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
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
      default:
        return status;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leave-requests/submit')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Form
        </Button>
      </div>

      {/* Success Message */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
                Leave Request Submitted Successfully!
              </h2>
              <p className="text-green-700 dark:text-green-300 mt-2">
                Your leave request has been submitted and notifications have been sent to the relevant approvers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Request Summary</CardTitle>
            <Badge variant={getStatusBadgeVariant(leaveRequest.overallStatus)}>
              {getStatusLabel(leaveRequest.overallStatus)}
            </Badge>
          </div>
          <CardDescription>
            Request ID: {leaveRequest.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employee Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{leaveRequest.employee?.name || user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{leaveRequest.employee?.email || user.email}</p>
              </div>
            </div>
          </div>

          {/* Leave Details */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Leave Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
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
              {leaveRequest.reason && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="text-sm font-medium">{leaveRequest.reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          {leaveRequest.projects && leaveRequest.projects.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Affected Projects
              </h3>
              <div className="space-y-3 pl-6">
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
            </div>
          )}

          {/* Approval Status */}
          {leaveRequest.approvals && leaveRequest.approvals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Approval Status
              </h3>
              <div className="space-y-3 pl-6">
                {leaveRequest.approvals?.map((approval) => {
                  const isPending = approval.status === 'pending';
                  const isApproved = approval.status === 'approved';
                  const isRejected = approval.status === 'rejected';
                  
                  return (
                    <Card
                      key={approval.id}
                      className={`${
                        isApproved
                          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                          : isRejected
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                          : 'bg-muted/50'
                      }`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold">
                                {approval.approver?.name || 'Unknown Approver'}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {approval.approverRole}
                              </Badge>
                            </div>
                            {approval.comments && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                &quot;{approval.comments}&quot;
                              </p>
                            )}
                            {approval.decidedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Decided: {formatDate(approval.decidedAt)} at{' '}
                                {parseLocalDate(approval.decidedAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                            {isPending && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Waiting for approval...
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={
                              isApproved
                                ? 'success'
                                : isRejected
                                ? 'destructive'
                                : 'outline'
                            }
                            className="shrink-0"
                          >
                            {isPending
                              ? 'Pending'
                              : isApproved
                              ? 'Approved'
                              : 'Rejected'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        {canWithdraw() && (
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
          <Button
            variant="outline"
            onClick={() => router.push('/requests/my-requests')}
          >
            View All My Requests
          </Button>
          <Button onClick={() => router.push('/leave-requests/submit')}>
            Submit Another Request
          </Button>
        </div>
      </div>
    </div>
  );
}

