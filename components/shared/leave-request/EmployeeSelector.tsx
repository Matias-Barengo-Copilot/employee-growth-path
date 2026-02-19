'use client';

import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { getEligibleEmployees, EmployeeListItem } from '@/lib/api/employees';
import {
  FormControl,
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
import { Loader2 } from 'lucide-react';

interface EmployeeSelectorProps<TFieldValues extends Record<string, unknown> = Record<string, unknown>> {
  form: UseFormReturn<TFieldValues>;
  name: string;
  label?: string;
  placeholder?: string;
  companyId?: string;
  excludeEmployeeId?: string; // Employee ID to exclude from the list (e.g., current user)
  disabled?: boolean;
}

/**
 * EmployeeSelector Component
 * 
 * A reusable dropdown component for selecting employees eligible to be PM or Tech Lead.
 * Loads employees with roles: supervisor, hr, md from /api/employees/eligible
 * 
 * @example
 * ```tsx
 * <EmployeeSelector
 *   form={form}
 *   name="pmId"
 *   label="Project Manager"
 *   placeholder="Select PM"
 * />
 * ```
 */
export function EmployeeSelector<TFieldValues extends Record<string, unknown> = Record<string, unknown>>({
  form,
  name,
  label,
  placeholder = 'Select member',
  companyId,
  excludeEmployeeId,
  disabled = false,
}: EmployeeSelectorProps<TFieldValues>) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        setIsLoading(true);
        setError(null);
        const eligibleEmployees = await getEligibleEmployees(companyId, excludeEmployeeId);
        setEmployees(eligibleEmployees);
      } catch (err) {
        console.error('Failed to load eligible employees:', err);
        setError(err instanceof Error ? err.message : 'Failed to load employees');
      } finally {
        setIsLoading(false);
      }
    }

    loadEmployees();
  }, [companyId, excludeEmployeeId]);

  return (
    <FormField
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      control={form.control as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name={name as any}
      render={({ field }) => {
        return (
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
              disabled={disabled || isLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="px-2 py-1.5 text-sm text-destructive">
                    {error}
                  </div>
                ) : employees.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No eligible members found
                  </div>
                ) : (
                  employees.map((employee) => (
                    <SelectItem 
                      key={employee.id} 
                      value={employee.id}
                      textValue={`${employee.name} (${employee.email})`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{employee.name}</span>
                        <span className="text-xs text-muted-foreground">{employee.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
