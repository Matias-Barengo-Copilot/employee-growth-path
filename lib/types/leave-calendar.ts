/**
 * Types and utilities for the Leave Calendar component
 * Handles individual day selection with leave types and half-day support
 */

import { LeaveType } from './index';

/**
 * Leave calendar day entry
 * Represents a single selected day with its leave type and half-day information
 */
export interface LeaveCalendarDay {
  date: string; // Format: YYYY-MM-DD
  leaveType: LeaveType; // 'vacation' | 'personal_sick' | 'unpaid' | 'other'
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

/**
 * Leave type configuration for the calendar
 * Includes codes for display: v1, v2, v (vacation), p1, p2, p (personal_sick), etc.
 */
export const LEAVE_TYPE_CONFIG = {
  vacation: {
    label: 'Vacation Leaves',
    shortLabel: 'Vacation',
    color: 'vacation',
    description: 'Planned vacation time off',
    codes: {
      full: 'v',
      halfMorning: 'v1',
      halfAfternoon: 'v2',
    },
  },
  personal_sick: {
    label: 'Personal/Sick Leaves',
    shortLabel: 'Personal/Sick',
    color: 'personal_sick',
    description: 'For illness, medical appointments, or personal time',
    codes: {
      full: 'p',
      halfMorning: 'p1',
      halfAfternoon: 'p2',
    },
  },
  unpaid: {
    label: 'Unpaid Leaves',
    shortLabel: 'Unpaid',
    color: 'unpaid',
    description: 'Unpaid time off',
    codes: {
      full: 'u',
      halfMorning: 'u1',
      halfAfternoon: 'u2',
    },
  },
  other: {
    label: 'Others',
    shortLabel: 'Other',
    color: 'other',
    description: 'Other types of leave',
    codes: {
      full: 'o',
      halfMorning: 'o1',
      halfAfternoon: 'o2',
    },
  },
} as const;

/**
 * Get the display code for a leave type
 * Returns: v1, v2, v (for vacation), p1, p2, p (for personal_sick), etc.
 */
export function getLeaveTypeCode(
  leaveType: LeaveType,
  isHalfDay: boolean,
  halfDayPeriod?: 'morning' | 'afternoon'
): string {
  const config = LEAVE_TYPE_CONFIG[leaveType];
  if (!isHalfDay) {
    return config.codes.full;
  }
  return halfDayPeriod === 'morning' 
    ? config.codes.halfMorning 
    : config.codes.halfAfternoon;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Check if a date is in the past
 * NOTE: This function now always returns false to allow past dates for emergency requests
 */
export function isPastDate(): boolean {
  return false; // Allow all dates, including past dates for emergency requests
}

/**
 * Calculate total working days from selected calendar days
 * Excludes weekends and counts half-days as 0.5
 */
export function calculateWorkingDays(days: LeaveCalendarDay[]): number {
  return days.reduce((total, day) => {
    if (day.isHalfDay) {
      return total + 0.5;
    }
    return total + 1;
  }, 0);
}

/**
 * Calculate total full days (excluding half-days)
 */
export function calculateFullDays(days: LeaveCalendarDay[]): number {
  return days.filter(day => !day.isHalfDay).length;
}

/**
 * Calculate total half-days count
 */
export function calculateHalfDaysCount(days: LeaveCalendarDay[]): number {
  return days.filter(day => day.isHalfDay).length;
}

/**
 * Convert LeaveCalendarDay[] to format expected by API
 */
export function convertCalendarDaysToApiFormat(days: LeaveCalendarDay[]) {
  return days.map(day => ({
    date: day.date,
    leaveType: day.leaveType,
    isHalfDay: day.isHalfDay,
    // Only include halfDayPeriod if isHalfDay is true and halfDayPeriod is defined
    // Otherwise, omit it (undefined) to avoid validation errors
    halfDayPeriod: day.isHalfDay && day.halfDayPeriod ? day.halfDayPeriod : undefined,
  }));
}

/**
 * Convert API format to LeaveCalendarDay[]
 */
export function convertApiFormatToCalendarDays(
  apiDays: Array<{
    date: string;
    leaveType: string | LeaveType;
    isHalfDay: boolean;
    halfDayPeriod?: string | null;
  }>
): LeaveCalendarDay[] {
  return apiDays.map(day => ({
    date: day.date,
    leaveType: day.leaveType as LeaveType, // Type assertion for API compatibility
    isHalfDay: day.isHalfDay,
    halfDayPeriod: day.halfDayPeriod === 'morning' || day.halfDayPeriod === 'afternoon' 
      ? day.halfDayPeriod 
      : undefined,
  }));
}
