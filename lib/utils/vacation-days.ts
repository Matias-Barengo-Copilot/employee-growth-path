/**
 * Utility functions for vacation days management
 */

import { LeaveCalendarDay } from '@/lib/types/leave-calendar';

/**
 * Calculate total leave days used from leave days
 * Counts days of type "vacation" and "personal_sick"
 * Excludes "unpaid" and "other" leave types
 * Half days count as 0.5, full days count as 1
 */
export function calculateVacationDaysUsed(leaveDays: LeaveCalendarDay[]): number {
  return leaveDays.reduce((total, day) => {
    // Only count vacation and personal_sick leave types
    // Unpaid and other types do not count against available leave days
    if (day.leaveType !== 'vacation' && day.leaveType !== 'personal_sick') {
      return total;
    }
    
    if (day.isHalfDay) {
      return total + 0.5;
    }
    
    return total + 1;
  }, 0);
}

/**
 * Check if vacation days should be reset based on last reset date
 * Returns true if last reset was before the current year
 */
export function shouldResetVacationDays(lastResetDate: Date | string | null): boolean {
  if (!lastResetDate) {
    return true; // Never reset, should reset now
  }
  
  const resetDate = typeof lastResetDate === 'string' ? new Date(lastResetDate) : lastResetDate;
  const currentYear = new Date().getFullYear();
  const resetYear = resetDate.getFullYear();
  
  return resetYear < currentYear;
}

/**
 * Get the number of days until the next vacation days reset
 * Returns 0 if reset should happen now
 */
export function getDaysUntilNextReset(lastResetDate: Date | string | null): number {
  if (shouldResetVacationDays(lastResetDate)) {
    return 0;
  }
  
  if (!lastResetDate) {
    return 0;
  }
  
  const resetDate = typeof lastResetDate === 'string' ? new Date(lastResetDate) : lastResetDate;
  const nextReset = new Date(resetDate);
  nextReset.setFullYear(nextReset.getFullYear() + 1);
  nextReset.setMonth(0, 1); // January 1st
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextReset.setHours(0, 0, 0, 0);
  
  const diffTime = nextReset.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Round vacation days to handle half-days properly
 * Uses Math.round to handle 0.5 days correctly
 */
export function roundVacationDays(days: number): number {
  return Math.round(days * 2) / 2; // Round to nearest 0.5
}
