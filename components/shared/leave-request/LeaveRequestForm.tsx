'use client';

import { useForm, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { leaveRequestFormSchema, LeaveRequestFormData } from '@/lib/utils/validation/leave-request.schema';
import { submitLeaveRequest, saveDraft, getDrafts, deleteDraft, Draft, getLeaveDaysAvailedSummary } from '@/lib/api/leave-requests';
import { LeaveCalendar } from './calendar/LeaveCalendar';
import { LeaveCalendarDay, convertApiFormatToCalendarDays, convertCalendarDaysToApiFormat } from '@/lib/types/leave-calendar';
import { calculateLeaveDaysAvailed, roundLeaveDays } from '@/lib/utils/leave-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CalendarDays } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ProjectDetailsForm } from './ProjectDetailsForm';
import { Loader2, Trash2, FileX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function LeaveRequestForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [draftToLoad, setDraftToLoad] = useState<Draft | { id: 'new' } | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [leaveDaysAvailed, setLeaveDaysAvailed] = useState<{ vacation: number; personal: number } | null>(null);

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      leaveDays: [],
      reason: '',
      projects: [{ projectName: '', pmId: '', techLeadId: '' }], // Initialize with one empty project
    },
    // Note: shouldFocusError is set to false to prevent unwanted scrolling behavior
    // However, this impacts accessibility. Consider implementing custom scroll-to-error
    // logic that focuses the first error field without aggressive scrolling
    shouldFocusError: false,
  });

  // Watch leaveDays to sync with calendar
  const leaveDays = form.watch('leaveDays');
  
  // Check if form has unsaved changes
  const isDirty = form.formState.isDirty;

  const loadLeaveDaysAvailed = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await getLeaveDaysAvailedSummary();
      if (response.success) {
        setLeaveDaysAvailed(response.data);
      }
    } catch (error) {
      console.error('Failed to load leave days availed:', error);
    }
  }, [session?.user?.id]);

  const loadDrafts = useCallback(async () => {
    try {
      const response = await getDrafts();
      if (response.success && response.data) {
        setDrafts(response.data);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, []);

  // Load drafts and employee vacation days on mount
  useEffect(() => {
    loadDrafts();
    loadLeaveDaysAvailed();
  }, [loadDrafts, loadLeaveDaysAvailed]);

  // Scroll to top when form mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const loadDraftIntoForm = (draft: Draft, skipConfirmation = false) => {
    // Check if there are unsaved changes
    if (isDirty && !skipConfirmation) {
      setDraftToLoad(draft);
      return;
    }

    // Convert draft data to form format
    let draftLeaveDays: LeaveCalendarDay[] = [];
    
    if (draft.leaveDays && draft.leaveDays.length > 0) {
      // Draft already has leaveDays format
      draftLeaveDays = convertApiFormatToCalendarDays(draft.leaveDays);
    } else if (draft.fromDate && draft.toDate) {
      // Convert from date range to individual days (for old drafts)
      const from = new Date(draft.fromDate);
      const to = new Date(draft.toDate);
      const days: LeaveCalendarDay[] = [];
      
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          days.push({
            date: `${year}-${month}-${day}`,
            leaveType: (draft.leaveType as 'vacation' | 'personal_sick' | 'unpaid' | 'other') || 'vacation',
            isHalfDay: false,
          });
        }
      }
      
      draftLeaveDays = days;
    }

    form.reset({
      leaveDays: draftLeaveDays,
      reason: draft.reason || '',
      projects: draft.projects?.map((p) => ({
        projectName: p.projectName || '',
        pmId: p.pmId || '',
        techLeadId: p.techLeadId || '',
      })) || [],
    });
    setCurrentDraftId(draft.id);
    setDraftToLoad(null);
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;

    setIsDeletingDraft(true);
    try {
      await deleteDraft(draftToDelete.id);
      toast.success('Draft Deleted', 'The draft has been deleted successfully.');
      // If the deleted draft was the current one, clear it
      if (currentDraftId === draftToDelete.id) {
        setCurrentDraftId(undefined);
        form.reset({
          leaveDays: [],
          reason: '',
          projects: [{ projectName: '', pmId: '', techLeadId: '' }],
        });
      }
      // Refresh drafts list
      loadDrafts();
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to delete draft');
    } finally {
      setIsDeletingDraft(false);
      setDraftToDelete(null);
    }
  };

  const handleNewDraft = () => {
    // Check if there are unsaved changes
    if (isDirty) {
      // Show confirmation dialog (we'll reuse the draftToLoad state for this)
      setDraftToLoad({ id: 'new' });
      return;
    }
    
    // Clear form and current draft
    form.reset({
      leaveDays: [],
      reason: '',
      projects: [{ projectName: '', pmId: '', techLeadId: '' }],
    });
    setCurrentDraftId(undefined);
  };

  const confirmNewDraft = () => {
    form.reset({
      leaveDays: [],
      reason: '',
      projects: [{ projectName: '', pmId: '', techLeadId: '' }],
    });
    setCurrentDraftId(undefined);
    setDraftToLoad(null);
  };

  const onSaveDraft = async (data: LeaveRequestFormData) => {
    setIsSavingDraft(true);
    try {
      const response = await saveDraft(
        {
          leaveDays: data.leaveDays.length > 0 ? convertCalendarDaysToApiFormat(data.leaveDays) : undefined,
          reason: data.reason || undefined,
          projects: data.projects.length > 0 ? data.projects : undefined,
        },
        currentDraftId
      );

      if (response.success && response.data) {
        setCurrentDraftId(response.data.id);
        toast.success('Draft Saved', 'Your draft has been saved successfully.');
        // Refresh drafts list
        loadDrafts();
      }
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const onSubmit = async (data: LeaveRequestFormData) => {
    setIsSubmitting(true);
    try {
      const apiDays = convertCalendarDaysToApiFormat(data.leaveDays);
      const response = await submitLeaveRequest({
        leaveDays: apiDays,
        reason: data.reason || undefined,
        projects: data.projects,
      });

      if (response.success && response.data) {
        // Clear current draft ID since the request was submitted successfully
        setCurrentDraftId(undefined);
        // Redirect to confirmation page with the leave request ID
        router.push(`/leave-requests/${response.data.id}/confirmation`);
      }
    } catch (error) {
      // Handle backend validation errors
      if (error instanceof Error && 'validationErrors' in error && error.validationErrors) {
        const validationErrors = error.validationErrors as Array<{ path: string; message: string }>;
        
        // Set errors on form fields based on backend validation errors
        validationErrors.forEach((err) => {
          // Convert backend path (e.g., "projects.0.pmId") to React Hook Form path
          // Use Path type for better type safety
          const fieldPath = err.path as Path<LeaveRequestFormData>;
          form.setError(fieldPath, {
            type: 'server',
            message: err.message,
          });
        });

        // Show toast with general error message
        toast.error('Validation Error', error.message || 'Please check the form for errors');
      } else {
        // Handle other errors
        toast.error('Error', error instanceof Error ? error.message : 'Failed to submit leave request');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Leave Days Availed Banner - Only show if there are availed days */}
        {leaveDaysAvailed !== null && (leaveDaysAvailed.vacation > 0 || leaveDaysAvailed.personal > 0) && (() => {
          const leaveDaysInSelection = calculateLeaveDaysAvailed(leaveDays);
          const vacationInRequest = roundLeaveDays(leaveDaysInSelection.vacation);
          const personalInRequest = roundLeaveDays(leaveDaysInSelection.personal);
          const totalVacationAfter = leaveDaysAvailed.vacation + vacationInRequest;
          const totalPersonalAfter = leaveDaysAvailed.personal + personalInRequest;
          const hasNewDays = vacationInRequest > 0 || personalInRequest > 0;
          
          return (
            <Card className="border-accent bg-accent/10 dark:bg-accent/20 hover:bg-accent/20 dark:hover:bg-accent/30 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent/20 dark:bg-accent/30">
                      <CalendarDays className="h-6 w-6 text-accent dark:text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Leave Days Availed</p>
                      <div className="flex flex-col gap-1 mt-2">
                        {leaveDaysAvailed.vacation > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-accent dark:text-accent">
                              {leaveDaysAvailed.vacation}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {leaveDaysAvailed.vacation === 1 ? 'vacation leave' : 'vacation leaves'} availed
                            </span>
                            {hasNewDays && vacationInRequest > 0 && (
                              <span className="text-xs text-muted-foreground">
                                → {totalVacationAfter}
                              </span>
                            )}
                          </div>
                        )}
                        {leaveDaysAvailed.personal > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-accent dark:text-accent">
                              {leaveDaysAvailed.personal}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {leaveDaysAvailed.personal === 1 ? 'personal leave' : 'personal leaves'} availed
                            </span>
                            {hasNewDays && personalInRequest > 0 && (
                              <span className="text-xs text-muted-foreground">
                                → {totalPersonalAfter}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasNewDays && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Using in this request:</p>
                      {vacationInRequest > 0 && (
                        <p className="text-sm font-medium text-foreground">
                          {vacationInRequest} {vacationInRequest === 1 ? 'vacation' : 'vacation'} day{vacationInRequest !== 1 ? 's' : ''}
                        </p>
                      )}
                      {personalInRequest > 0 && (
                        <p className="text-sm font-medium text-foreground">
                          {personalInRequest} {personalInRequest === 1 ? 'personal' : 'personal'} day{personalInRequest !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Leave Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Select Leave Days</CardTitle>
            <CardDescription>
              Click on dates to select them and choose the leave type. Weekends are not available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Leave Days Info - Only show if there are days in selection */}
            {(() => {
              const leaveDaysInSelection = calculateLeaveDaysAvailed(leaveDays);
              const vacationInRequest = roundLeaveDays(leaveDaysInSelection.vacation);
              const personalInRequest = roundLeaveDays(leaveDaysInSelection.personal);
              
              // Show info if there are leave days (vacation or personal_sick) in selection
              if (vacationInRequest > 0 || personalInRequest > 0) {
                return (
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <span>
                        {vacationInRequest > 0 && (
                          <>Using {vacationInRequest} {vacationInRequest === 1 ? 'vacation' : 'vacation'} day{vacationInRequest !== 1 ? 's' : ''} in this request.</>
                        )}
                        {vacationInRequest > 0 && personalInRequest > 0 && ' '}
                        {personalInRequest > 0 && (
                          <>Using {personalInRequest} {personalInRequest === 1 ? 'personal' : 'personal'} day{personalInRequest !== 1 ? 's' : ''} in this request.</>
                        )}
                        {' '}(Unpaid leaves do not count.)
                      </span>
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}
            
            <FormField
              control={form.control}
              name="leaveDays"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LeaveCalendar
                      selectedDays={field.value || []}
                      onDaysChange={(days) => {
                        field.onChange(days);
                      }}
                      disabled={isSubmitting || isSavingDraft}
                    />
                  </FormControl>
                  <FormDescription>
                    Select individual days and specify the leave type for each day. Half-day options are available.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Reason Section */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>
              Provide additional details about your leave request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for leave request..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide additional details about your leave request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Projects Section */}
        <Card>
          <CardContent>
            <ProjectDetailsForm
              form={form}
              excludeEmployeeId={session?.user?.employeeId}
              userRole={session?.user?.role}
            />
          </CardContent>
        </Card>

        {/* Drafts Section */}
        {drafts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Drafts</CardTitle>
              <CardDescription>
                Continue editing a saved draft or start a new request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {drafts.map((draft) => {
                  const draftDays = draft.leaveDays?.length || 0;
                  const draftDateRange = draft.fromDate && draft.toDate 
                    ? `${draft.fromDate} to ${draft.toDate}`
                    : draftDays > 0
                    ? `${draftDays} day${draftDays !== 1 ? 's' : ''} selected`
                    : 'No dates selected';
                  
                  const isCurrentDraft = currentDraftId === draft.id;
                  
                  return (
                    <div
                      key={draft.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCurrentDraft 
                          ? 'bg-accent/10 border-accent' 
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            Draft {draftDateRange && `(${draftDateRange})`}
                          </p>
                          {isCurrentDraft && (
                            <Badge variant="secondary" className="text-xs">
                              Currently editing
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(draft.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => loadDraftIntoForm(draft)}
                          disabled={isSubmitting || isSavingDraft}
                        >
                          Load Draft
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDraftToDelete(draft)}
                          disabled={isSubmitting || isSavingDraft || isDeletingDraft}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting || isSavingDraft}
            >
              Cancel
            </Button>
            {currentDraftId && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleNewDraft}
                disabled={isSubmitting || isSavingDraft}
                className="text-muted-foreground"
              >
                <FileX className="h-4 w-4 mr-2" />
                New Draft
              </Button>
            )}
          </div>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit(onSaveDraft)}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Draft'
              )}
            </Button>
            <Button type="submit" disabled={isSubmitting || isSavingDraft}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Leave Request'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Draft Confirmation Dialog */}
      <Dialog open={!!draftToDelete} onOpenChange={() => setDraftToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDraftToDelete(null)}
              disabled={isDeletingDraft}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDraft}
              disabled={isDeletingDraft}
            >
              {isDeletingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Draft / New Draft Confirmation Dialog (if there are unsaved changes) */}
      <Dialog open={!!draftToLoad} onOpenChange={() => setDraftToLoad(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              {draftToLoad?.id === 'new' 
                ? 'You have unsaved changes in the form. Starting a new draft will discard your current changes. Do you want to continue?'
                : 'You have unsaved changes in the form. Loading this draft will discard your current changes. Do you want to continue?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDraftToLoad(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (draftToLoad) {
                  if (draftToLoad.id === 'new') {
                    confirmNewDraft();
                  } else if ('employeeId' in draftToLoad) {
                    loadDraftIntoForm(draftToLoad, true);
                  }
                }
              }}
            >
              {draftToLoad?.id === 'new' ? 'Start New Draft' : 'Load Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
