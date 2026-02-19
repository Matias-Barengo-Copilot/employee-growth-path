import { getAuthenticatedUser } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';
import { LeaveRequestForm } from '@/components/shared/leave-request/LeaveRequestForm';

/**
 * Submit Leave Request Page
 * Server Component que obtiene datos del usuario y renderiza el formulario
 * HR cannot access this page - they don't need to create leave requests
 */
export default async function SubmitLeaveRequestPage() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    redirect('/sign-in');
  }

  // HR cannot submit leave requests
  if (user.role === 'hr') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Submit Leave Request
        </h1>
        <p className="text-muted-foreground mt-2">
          Fill out the form below to submit a new leave request.
        </p>
      </div>

      <LeaveRequestForm />
    </div>
  );
}

