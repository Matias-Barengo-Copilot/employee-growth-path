'use client';

import { useState } from 'react';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LeaveRequestListItem } from './LeaveRequestsList';
import { useToast } from '@/lib/hooks/useToast';

interface ApprovalActionsProps {
  leaveRequest: LeaveRequestListItem;
  user: AuthenticatedUser;
  onActionComplete: () => void;
}

const approvalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

/**
 * Approval Actions Component
 * Allows supervisors, MD, and HR to approve or reject leave requests
 */
export function ApprovalActions({ leaveRequest, user, onActionComplete }: ApprovalActionsProps) {
  const toast = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      status: 'approved',
      comments: '',
    },
  });

  // Check if user can approve this request
  // IMPORTANT: PM and Tech Lead are functional roles determined by project assignments,
  // not by the user's role in the database. Supervisors can only approve when assigned as PM or Tech Lead in projects.
  const canApprove = () => {
    // HR can approve any request
    if (user.role === 'hr') {
      return true;
    }

    // FIRST: Check if user is PM or Tech Lead for any project in this leave request
    // This applies to ALL users including supervisors
    // PM/Tech Lead are functional roles based on project assignments
    if (leaveRequest.projects && leaveRequest.projects.length > 0) {
      const isPM = leaveRequest.projects.some(
        (p) => p.pmId === user.employeeId || p.pm?.id === user.employeeId
      );
      const isTechLead = leaveRequest.projects.some(
        (p) => p.techLeadId === user.employeeId || p.techLead?.id === user.employeeId
      );
      
      if (isPM || isTechLead) {
        return true;
      }
    }

    // If not PM/Tech Lead, check if user is supervisor (general role)
    // Note: Most users have role "supervisor" but may not have approval permissions
    // unless they are PM/Tech Lead for a specific project
    if (user.role === 'supervisor') {
      // For now, supervisors can approve, but this might need to be restricted
      // based on business rules (e.g., only if they are assigned to the project)
      return true;
    }

    return false;
  };

  // Check if user has already approved/rejected
  const userApproval = leaveRequest.approvals?.find(
    (a) => a.approverId === user.employeeId || (user.role === 'hr' && a.approverRole === 'hr')
  );

  const hasAlreadyDecided = userApproval && userApproval.status !== 'pending';

  // Check if HR has already decided (this determines the final status)
  const hrApproval = leaveRequest.approvals?.find((a) => a.approverRole === 'hr');
  const hasHRDecided = hrApproval && hrApproval.status !== 'pending';
  const isHR = user.role === 'hr';
  
  // Check if the request has been cancelled (nobody can approve cancelled requests)
  const isCancelled = leaveRequest.overallStatus === 'cancelled';
  
  // Supervisors can still approve/reject after HR decides (for record keeping)
  // HR can always approve/reject (they can change their decision)
  // Only hide buttons if request is cancelled
  const shouldShowButtons = !isCancelled;

  const openDialog = (type: 'approved' | 'rejected') => {
    setActionType(type);
    form.reset({
      status: type,
      comments: '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ApprovalFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/leave-requests/${leaveRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: data.status,
          comments: data.comments || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        throw new Error(error.error?.message || 'Failed to process approval');
      }

      toast.success('Success', `Leave request ${data.status} successfully`);
      setIsDialogOpen(false);
      onActionComplete();
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to process approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canApprove()) {
    return null;
  }

  // If the request has already been processed and user is not HR, don't show buttons
  if (!shouldShowButtons) {
    return null;
  }

  if (hasAlreadyDecided) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={userApproval.status === 'approved' ? 'success' : 'destructive'}>
            You {userApproval.status === 'approved' ? 'approved' : 'rejected'} this request
          </Badge>
        </div>
        {hasHRDecided && !isHR && (
          <p className="text-xs text-muted-foreground">
            HR has already {hrApproval.status === 'approved' ? 'approved' : 'rejected'} this request. Your decision is recorded for reference.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {hasHRDecided && !isHR && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-blue-900 dark:text-blue-100 font-medium">
              HR has already {hrApproval.status === 'approved' ? 'approved' : 'rejected'} this request.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              You can still record your decision below for reference, but it won't change the final status.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => openDialog('approved')}
            disabled={isSubmitting}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={() => openDialog('rejected')}
            disabled={isSubmitting}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {hasHRDecided && !isHR ? (
                <>
                  HR has already {hrApproval.status === 'approved' ? 'approved' : 'rejected'} this request.
                  {actionType === 'approved'
                    ? ' You can still record your approval for reference, but it won\'t change the final status.'
                    : ' You can still record your rejection for reference, but it won\'t change the final status.'}
                </>
              ) : (
                actionType === 'approved'
                  ? 'Are you sure you want to approve this leave request?'
                  : 'Are you sure you want to reject this leave request? You can add comments below.'
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          actionType === 'approved'
                            ? 'Add any comments...'
                            : 'Please provide a reason for rejection...'
                        }
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionType === 'approved' ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

