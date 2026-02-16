'use client';

import Link from 'next/link';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, ArrowRight, Mail, MapPin } from 'lucide-react';
import { formatLocalDate } from '@/lib/utils/date';
import { LeaveRequestListItem } from './LeaveRequestsList';

interface LeaveRequestCardProps {
  leaveRequest: LeaveRequestListItem;
  user?: AuthenticatedUser; // Optional, not currently used but kept for API compatibility
  showEmployeeInfo?: boolean;
}

/**
 * Leave Request Card Component
 * Displays a summary of a leave request in card format
 */
export function LeaveRequestCard({ 
  leaveRequest,
  showEmployeeInfo = false 
}: LeaveRequestCardProps) {
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

  const getStatusBadgeClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      case 'approved':
        return ''; // Uses success variant
      case 'rejected':
        return ''; // Uses destructive variant
      case 'cancelled':
        return ''; // Uses secondary variant
      case 'draft':
        return ''; // Uses outline variant
      default:
        return '';
    }
  };

  const getLeaveTypeBadgeClasses = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vacation':
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'personal_sick':
        return 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700';
      case 'unpaid':
        return 'bg-accent/10 text-accent border-accent dark:bg-accent/20 dark:text-accent dark:border-accent/50';
      case 'other':
        return 'bg-accent/10 text-accent border-accent dark:bg-accent/20 dark:text-accent dark:border-accent/50';
      default:
        return '';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'employee':
        return 'outline';
      case 'supervisor':
        return 'secondary';
      case 'hr':
        return 'default';
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

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'employee':
        return 'Member';
      case 'supervisor':
        return 'Supervisor';
      case 'hr':
        return 'HR';
      default:
        return role;
    }
  };

  const roleTypeLabels: Record<string, string> = {
    employee: 'Member',
    individual_contractor: 'Individual Contractor',
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatLocalDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Count pending approvals
  const pendingApprovals = leaveRequest.approvals?.filter(
    (a) => a.status === 'pending'
  ).length || 0;
  const totalApprovals = leaveRequest.approvals?.length || 0;

  const statusColors = {
    pending: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
    approved: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
    rejected: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    cancelled: 'border-l-gray-400 bg-gray-50/50 dark:bg-gray-950/20',
    draft: 'border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
  };

  const statusColor = statusColors[leaveRequest.overallStatus.toLowerCase() as keyof typeof statusColors] || 'border-l-gray-400';

  return (
    <Link href={`/leave-requests/${leaveRequest.id}`}>
      <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${statusColor} mb-8`}>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left Section: Employee Info */}
            {showEmployeeInfo && leaveRequest.employee && (
              <div className="shrink-0 lg:w-56 xl:w-64 border-r pr-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1.5">
                      {leaveRequest.employee.name}
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{leaveRequest.employee.email}</span>
                      </div>
                      {'country' in leaveRequest.employee && leaveRequest.employee.country && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>{leaveRequest.employee.country}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <Badge 
                          variant={getRoleBadgeVariant(leaveRequest.employee.role)} 
                          className="text-xs px-2 py-0.5 font-medium"
                        >
                          {getRoleLabel(leaveRequest.employee.role)}
                        </Badge>
                        {'roleType' in leaveRequest.employee && 
                         leaveRequest.employee.roleType === 'individual_contractor' && (
                          <Badge 
                            variant="outline"
                            className="text-xs px-2 py-0.5 font-medium border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                          >
                            {roleTypeLabels[leaveRequest.employee.roleType]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Section: Leave Request Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge 
                    variant={leaveRequest.overallStatus.toLowerCase() === 'pending' ? 'outline' : getStatusBadgeVariant(leaveRequest.overallStatus)}
                    className={`text-xs font-semibold px-3 py-1.5 shadow-sm uppercase tracking-wide ${getStatusBadgeClasses(leaveRequest.overallStatus)}`}
                  >
                    {getStatusLabel(leaveRequest.overallStatus)}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-3 py-1.5 border font-medium ${getLeaveTypeBadgeClasses(leaveRequest.leaveType)}`}
                  >
                    {getLeaveTypeLabel(leaveRequest.leaveType)}
                  </Badge>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>

              {/* Details Grid - Horizontal Layout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Period</p>
                    <p className="text-sm font-medium leading-tight">
                      {formatDate(leaveRequest.fromDate)} - {formatDate(leaveRequest.toDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                    <p className="text-sm font-medium">
                      {leaveRequest.totalDays} {leaveRequest.totalDays === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                </div>
                {totalApprovals > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Approvals</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[40px]">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${((totalApprovals - pendingApprovals) / totalApprovals) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium whitespace-nowrap">
                          {totalApprovals - pendingApprovals}/{totalApprovals}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {leaveRequest.projects && leaveRequest.projects.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Projects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {leaveRequest.projects.slice(0, 2).map((project) => (
                        <Badge 
                          key={project.id} 
                          variant="secondary" 
                          className="text-xs px-2 py-1 font-medium bg-secondary/80 hover:bg-secondary"
                        >
                          {project.projectName || 'Unknown'}
                        </Badge>
                      ))}
                      {leaveRequest.projects.length > 2 && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs px-2 py-1 font-medium bg-secondary/80 hover:bg-secondary"
                        >
                          +{leaveRequest.projects.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reason and Footer Row */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t">
                {leaveRequest.reason && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Reason</p>
                    <p className="text-sm text-foreground line-clamp-1">
                      {leaveRequest.reason}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  Created {formatDate(leaveRequest.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

