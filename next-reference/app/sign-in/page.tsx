import { SignInButton } from '@/components/auth/SignInButton';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">CoPilot LMS</h1>
          <p className="mt-2 text-sm text-slate-600">Leave Management System</p>
        </div>
        <div className="mt-8 space-y-6">
          <SignInButton />
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">Only @copilotinnovations.com email addresses are allowed</p>
        </div>
      </div>
    </div>
  );
}
