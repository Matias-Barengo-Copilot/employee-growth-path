import { SignInButton } from '@/components/auth/SignInButton';
import { TestSignInForm } from '@/components/auth/TestSignInForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { isTestModeEnabled } from '@/lib/utils/test-mode';

export default function SignInPage() {
  const testMode = isTestModeEnabled();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">CoPilot LMS</h1>
          <p className="mt-2 text-sm text-slate-600">Leave Management System</p>
        </div>
        {testMode && (
          <Alert variant="default" className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Test Mode Enabled</AlertTitle>
            <AlertDescription className="text-yellow-700">Test accounts can sign in directly with their email address.</AlertDescription>
          </Alert>
        )}
        <div className="mt-8 space-y-6">
          <SignInButton />
          {testMode && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Or</span></div>
              </div>
              <TestSignInForm />
            </>
          )}
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">{testMode ? 'Production: Only @copilotinnovations.com email addresses are allowed' : 'Only @copilotinnovations.com email addresses are allowed'}</p>
        </div>
      </div>
    </div>
  );
}

