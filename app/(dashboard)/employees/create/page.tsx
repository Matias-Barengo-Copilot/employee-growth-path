import { CreateEmployeeForm } from '@/components/shared/employees/CreateEmployeeForm';
import { getAuthenticatedUser, requireRole } from '@/lib/middleware/auth';
import { redirect } from 'next/navigation';

/**
 * Create Employee Page
 * Only accessible by HR role
 */
export default async function CreateEmployeePage() {
  let user;
  try {
    user = await getAuthenticatedUser();
    
    // Only HR can create users
    requireRole(user, ['hr']);
  } catch {
    redirect('/sign-in');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Member
        </h1>
        <p className="text-muted-foreground mt-2">
          Create a new member account and send an invitation email. The member will receive an email to set their password.
        </p>
      </div>

      <CreateEmployeeForm user={user} />
    </div>
  );
}

