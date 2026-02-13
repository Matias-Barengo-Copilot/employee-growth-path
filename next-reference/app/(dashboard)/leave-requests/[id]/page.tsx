import { getAuthenticatedUser } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { LeaveRequestService } from '@/lib/services/leave-request.service';
import { LeaveRequestDetail } from '@/components/shared/leave-request/LeaveRequestDetail';
import { transformLeaveRequestDates } from '@/lib/utils/date';
import { LeaveRequestListItem } from '@/components/shared/leave-request/LeaveRequestsList';

/**
 * Leave Request Detail Page
 * Shows full details of a leave request with approval history
 */
export default async function LeaveRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    redirect('/sign-in');
  }

  const { id } = await params;
  const service = new LeaveRequestService();
  
  let leaveRequest;
  try {
    leaveRequest = await service.getLeaveRequestById(id, user);
  } catch {
    redirect('/requests/my-requests');
  }

  if (!leaveRequest) {
    redirect('/requests/my-requests');
  }

  // Transform dates to strings for client component
  // Note: Type assertion is needed because transformLeaveRequestDates returns a flexible type
  // that includes all fields from LeaveRequestInput, while LeaveRequestListItem expects
  // a more specific structure. The transformation ensures all dates are strings.
  // Using 'unknown' first as TypeScript suggests for safer type conversion
  const transformedRequest = transformLeaveRequestDates(leaveRequest) as unknown as LeaveRequestListItem;

  return <LeaveRequestDetail user={user} leaveRequest={transformedRequest} />;
}

