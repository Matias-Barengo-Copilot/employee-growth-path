'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser } from '@/lib/middleware/auth';
import { createEmployeeSchema, CreateEmployeeFormData } from '@/lib/utils/validation/employee.schema';
import { createEmployeeAndSendInvitation, updateEmployee } from '@/lib/api/employees';
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

interface CreateEmployeeFormProps {
  user?: AuthenticatedUser | null;
  employeeId?: string;
  initialData?: {
    name: string;
    email: string;
    country: string;
    role: 'employee' | 'supervisor' | 'hr';
    roleType?: 'employee' | 'individual_contractor';
    joiningDate?: string;
    birthday?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Create Employee Form Component
 * Allows HR to create new employees and send invitation emails
 * 
 * @example
 * ```tsx
 * <CreateEmployeeForm user={authenticatedUser} />
 * ```
 */
export function CreateEmployeeForm({ user, employeeId, initialData, onSuccess, onCancel }: CreateEmployeeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const isEditMode = !!employeeId;

  const form = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      country: '',
      role: 'employee' as const,
      roleType: 'employee' as const,
      joiningDate: '',
      birthday: '',
    },
  });

  // Watch role to automatically set roleType when role is 'hr'
  const selectedRole = form.watch('role');
  
  useEffect(() => {
    if (selectedRole === 'hr') {
      // HR always has roleType 'employee'
      form.setValue('roleType', 'employee', { shouldValidate: false });
    } else if (selectedRole === 'employee' || selectedRole === 'supervisor') {
      // Ensure roleType is set for employee/supervisor roles
      if (!form.getValues('roleType')) {
        form.setValue('roleType', 'employee', { shouldValidate: false });
      }
    }
  }, [selectedRole, form]);

  const onSubmit = async (data: CreateEmployeeFormData) => {
    setIsSubmitting(true);
    try {
      // Ensure roleType is 'employee' when role is 'hr'
      // roleType is always required in the schema, but we ensure it's 'employee' for HR
      const finalRoleType = data.role === 'hr' ? 'employee' : (data.roleType || 'employee');
      
      if (isEditMode && employeeId) {
        const response = await updateEmployee(employeeId, {
          name: data.name,
          email: data.email,
          country: data.country,
          role: data.role,
          roleType: finalRoleType,
          joiningDate: data.joiningDate?.trim() || undefined,
          birthday: data.birthday?.trim() || undefined,
        });

        if (response.success) {
          toast.success('Success', 'Member updated successfully!');
          onSuccess?.();
        }
      } else {
        const response = await createEmployeeAndSendInvitation({
          name: data.name,
          email: data.email,
          country: data.country,
          role: data.role,
          roleType: finalRoleType,
          joiningDate: data.joiningDate?.trim() || undefined,
          birthday: data.birthday?.trim() || undefined,
          // companyId will be set by backend based on authenticated user
          companyId: user?.companyId,
        });

        if (response.success) {
          toast.success('Success', 'Member created and invitation sent successfully!');
          onSuccess?.();
        }
      }
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} member`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Member' : 'Member Information'}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Update member information below.'
                : 'Fill in all required information for the new member. An invitation email will be sent automatically.'}
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
                    <Input placeholder="John Doe" {...field} />
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
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    An invitation email will be sent to this address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="employee">Member</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="hr">HR / Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the functional role for this member. This determines their permissions and access level.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Type only applies to 'employee' and 'supervisor' roles */}
            {(selectedRole === 'employee' || selectedRole === 'supervisor') && (
              <FormField
                control={form.control}
                name="roleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'employee'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Member</SelectItem>
                        <SelectItem value="individual_contractor">Individual Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of employment relationship. This is for classification purposes only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                    <FormDescription>
                      Date when member joined the company
                    </FormDescription>
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
                    <FormDescription>
                      Member&apos;s birthday for celebrations
                    </FormDescription>
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
            onClick={onCancel || (() => router.back())}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Member' : 'Create Member & Send Invitation'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

