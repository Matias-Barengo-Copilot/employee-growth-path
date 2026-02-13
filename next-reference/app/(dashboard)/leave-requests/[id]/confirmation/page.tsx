import { getAuthenticatedUser } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { LeaveRequestService } from '@/lib/services/leave-request.service';
import { LeaveRequestConfirmation, type LeaveRequestConfirmationProps } from '@/components/shared/leave-request/LeaveRequestConfirmation';
import { transformLeaveRequestDates } from '@/lib/utils/date';

/**
 * Leave Request Confirmation Page
 * Shows confirmation screen after submitting a leave request
 */
export default async function LeaveRequestConfirmationPage({
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
    redirect('/leave-requests/submit');
  }

  // Only the requester can see the confirmation page
  if (!leaveRequest || leaveRequest.employeeId !== user.employeeId) {
    redirect('/leave-requests/submit');
  }

  // Transform dates to strings for client component
  // Note: Type assertion is needed because transformLeaveRequestDates returns a flexible type
  // that includes all fields from LeaveRequestInput, while LeaveRequestConfirmationProps
  // expects a more specific structure. The transformation ensures compatibility.
  // Using 'unknown' first as TypeScript suggests for safer type conversion
  const transformedRequest = transformLeaveRequestDates(leaveRequest);

  return <LeaveRequestConfirmation user={user} leaveRequest={transformedRequest as unknown as LeaveRequestConfirmationProps['leaveRequest']} />;
}

