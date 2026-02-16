'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function TestSignInForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or user does not exist');
      } else if (result?.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      setError('An error occurred during sign-in');
      console.error('Error signing in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Account Sign In</CardTitle>
        <CardDescription>
          Sign in with a test account email (no Google OAuth required)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTestSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              data-testid="input-test-email"
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Test Accounts:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { email: 'md@copilot.com', label: 'MD' },
                  { email: 'pm@copilot.com', label: 'PM (supervisor)' },
                  { email: 'techlead@copilot.com', label: 'Tech Lead (supervisor)' },
                  { email: 'developer@copilot.com', label: 'Developer (employee)' },
                  { email: 'hr@copilot.com', label: 'HR' },
                  { email: 'designer@copilot.com', label: 'Designer (employee)' },
                ].map(({ email: testEmail, label }) => (
                  <button
                    key={testEmail}
                    type="button"
                    onClick={() => setEmail(testEmail)}
                    disabled={isLoading}
                    className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Click to use ${testEmail}`}
                    data-testid={`button-test-account-${testEmail.split('@')[0]}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-600" data-testid="text-test-signin-error">{error}</div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-test-signin">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in with Test Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
