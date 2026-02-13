/**
 * Utility functions for calculating leave days availed by type
 */

import { LeaveCalendarDay } from '@/lib/types/leave-calendar';

export interface LeaveDaysAvailed {
  vacation: number;
  personal: number;
}

/**
 * Calculate leave days availed by type from leave days
 * Separates vacation days from personal/sick days
 * Half days count as 0.5, full days count as 1
 */
export function calculateLeaveDaysAvailed(leaveDays: LeaveCalendarDay[]): LeaveDaysAvailed {
  let vacation = 0;
  let personal = 0;

  leaveDays.forEach((day) => {
    const dayValue = day.isHalfDay ? 0.5 : 1;
    
    if (day.leaveType === 'vacation') {
      vacation += dayValue;
    } else if (day.leaveType === 'personal_sick') {
      personal += dayValue;
    }
    // unpaid and other types are not counted
  });

  return { vacation, personal };
}

/**
 * Round leave days to handle half-days properly
 * Uses Math.round to handle 0.5 days correctly
 */
export function roundLeaveDays(days: number): number {
  return Math.round(days * 2) / 2; // Round to nearest 0.5
}
