'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '@/lib/utils/date';

interface Approval {
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
}

interface ApprovalHistoryProps {
  approvals: Approval[];
}

/**
 * Approval History Component
 * Displays approval/rejection history with timestamps and comments
 */
export function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Approval History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvals.map((approval) => {
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
                        <Badge variant="outline" className="text-xs capitalize">
                          {approval.approverRole === 'pm' ? 'PM' : 
                           approval.approverRole === 'tech_lead' ? 'Tech Lead' : 
                           approval.approverRole === 'hr' ? 'HR' :
                           approval.approverRole === 'supervisor' ? 'Supervisor' :
                           approval.approverRole}
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
      </CardContent>
    </Card>
  );
}

