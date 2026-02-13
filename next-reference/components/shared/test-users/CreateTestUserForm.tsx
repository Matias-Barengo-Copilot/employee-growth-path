'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { z } from 'zod';
import { createTestUser } from '@/lib/api/test-users';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

/**
 * TEST MODE: Schema for test user creation
 * Allows any email domain (not restricted to @copilotinnovations.com)
 */
const createTestUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'), // Any email domain allowed
  country: z.string().min(1, 'Country is required'),
  role: z.enum(['employee', 'supervisor', 'hr'], {
    message: 'Role is required',
  }),
  employeeNumber: z.string().optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().or(z.literal('')),
});

type CreateTestUserFormData = z.infer<typeof createTestUserSchema>;

interface CreateTestUserFormProps {
  user: AuthenticatedUser;
}

/**
 * TEST MODE: Form component for creating test users
 * Allows creating users with any email domain for testing purposes
 */
export function CreateTestUserForm({ user }: CreateTestUserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const form = useForm<CreateTestUserFormData>({
    resolver: zodResolver(createTestUserSchema),
    defaultValues: {
      name: '',
      email: '',
      country: '',
      role: undefined,
      employeeNumber: '',
      joiningDate: '',
      birthday: '',
    },
  });

  const onSubmit = async (data: CreateTestUserFormData) => {
    setIsSubmitting(true);
    try {
      const response = await createTestUser({
        name: data.name,
        email: data.email,
        country: data.country,
        role: data.role,
        employeeNumber: data.employeeNumber?.trim() || undefined,
        joiningDate: data.joiningDate?.trim() || undefined,
        birthday: data.birthday?.trim() || undefined,
        companyId: user.companyId,
      });

      if (response.success) {
        toast.success('Success', 'Test user created successfully! They can now sign in using their email.');
        form.reset();
      }
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to create test user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test User Information</CardTitle>
            <CardDescription>
              Create a test user with any email domain. They can sign in directly using their email
              without Google OAuth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Test User" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="test@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Any email domain is allowed in test mode. User will sign in with this email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input placeholder="USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Number</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="hr">HR / Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the role for this test user. This determines their permissions and
                    access level.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="joiningDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joining Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birthday</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Test User'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

