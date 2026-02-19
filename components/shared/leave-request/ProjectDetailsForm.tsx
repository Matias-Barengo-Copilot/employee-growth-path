'use client';

import { UseFormReturn, useFieldArray, Path, FieldArrayPath } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { Plus, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EmployeeSelector } from './EmployeeSelector';

type ProjectItem = { projectName: string; pmId?: string; techLeadId?: string };

interface ProjectDetailsFormProps<TFieldValues extends { projects: ProjectItem[] } = { projects: ProjectItem[] }> {
  form: UseFormReturn<TFieldValues>;
  companyId?: string;
  excludeEmployeeId?: string; // Employee ID to exclude from PM/Tech Lead dropdowns (e.g., current user)
  userRole?: string; // User role to conditionally show messages
}

/**
 * ProjectDetailsForm Component
 * 
 * Simplified project form for leave requests.
 * Allows adding multiple projects with:
 * - Project name (REQUIRED - text field)
 * - PM selection (optional - dropdown)
 * - Tech Lead selection (optional - dropdown)
 * 
 * @example
 * ```tsx
 * <ProjectDetailsForm
 *   form={form}
 *   companyId={user.companyId}
 * />
 * ```
 */
export function ProjectDetailsForm<TFieldValues extends { projects: ProjectItem[] } = { projects: ProjectItem[] }>({
  form,
  companyId,
  excludeEmployeeId,
  userRole,
}: ProjectDetailsFormProps<TFieldValues>) {
  type ProjectsPath = FieldArrayPath<TFieldValues>;
  
  const { fields, append, remove } = useFieldArray<TFieldValues, ProjectsPath>({
    control: form.control,
    name: 'projects' as ProjectsPath,
  });

  // Track if we've initialized to prevent duplicate appends
  const hasInitialized = useRef(false);

  // Ensure at least one project exists (only once on mount)
  // Only initialize if fields array is empty and we haven't initialized yet
  useEffect(() => {
    if (!hasInitialized.current && fields.length === 0) {
      hasInitialized.current = true;
      // Type assertion needed because React Hook Form's append expects a specific FieldArray type
      // but we know ProjectItem is compatible with the form's projects array type
      // Using 'as any' is necessary here due to React Hook Form's complex generic type constraints
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      append({ projectName: '', pmId: '', techLeadId: '' } as any, { shouldFocus: false });
    } else if (fields.length > 0) {
      // Mark as initialized if projects already exist (e.g., from defaultValues or draft)
      hasInitialized.current = true;
    }
  }, [fields.length, append]);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Projects *</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add the projects affected by this leave request
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Type assertion needed because React Hook Form's append expects a specific FieldArray type
              // but we know ProjectItem is compatible with the form's projects array type
              // Using 'as any' is necessary here due to React Hook Form's complex generic type constraints
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              append({ projectName: '', pmId: '', techLeadId: '' } as any);
            }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
        
        {/* Tip Message - Only visible for supervisors */}
        {userRole === 'supervisor' && (
          <div className="p-3 bg-accent/10 dark:bg-accent/20 border border-accent/30 dark:border-accent/40 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-accent dark:text-accent mt-0.5 shrink-0" />
              <p className="text-sm text-accent dark:text-accent">
                You can select the same person as both PM and Tech Lead. Only one notification will be sent per person.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <CardTitle className="text-base">Project {index + 1}</CardTitle>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <CardContent className="space-y-4 p-0">
              {/* Project Name - REQUIRED */}
              <FormField
                control={form.control}
                name={`projects.${index}.projectName` as Path<TFieldValues>}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter project name"
                        {...field}
                        value={field.value as string}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* PM and Tech Lead - Required */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EmployeeSelector
                  form={form}
                  name={`projects.${index}.pmId`}
                  label="Project Manager *"
                  placeholder="Select PM"
                  companyId={companyId}
                  excludeEmployeeId={excludeEmployeeId}
                />

                <EmployeeSelector
                  form={form}
                  name={`projects.${index}.techLeadId`}
                  label="Tech Lead *"
                  placeholder="Select Tech Lead"
                  companyId={companyId}
                  excludeEmployeeId={excludeEmployeeId}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global validation message for projects array */}
      <FormField
        control={form.control}
        name={'projects' as Path<TFieldValues>}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
