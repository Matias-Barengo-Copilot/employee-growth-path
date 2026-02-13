import { differenceInDays, parseISO } from 'date-fns';

export function calculateDaysBetween(fromDate: string, toDate: string): number {
  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  
  return differenceInDays(to, from) + 1;
}

export function parseLocalDate(dateString: string): Date {
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  return new Date(dateString + 'T00:00:00');
}

export function formatLocalDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', options);
}

/**
 * Safely converts a date value to a string
 * Handles Date objects, strings, null, and undefined
 * For date-only fields (from PostgreSQL date type), preserves local date to avoid timezone issues
 * 
 * @param date - Date value to convert (Date | string | null | undefined)
 * @returns YYYY-MM-DD string for date-only fields, ISO string for datetime, original string if string, null if null/undefined
 */
export function safeDateToString(
  date: Date | string | null | undefined
): string | null {
  if (date instanceof Date) {
    // Check if this is a date-only value (time is midnight in local timezone)
    // This handles PostgreSQL date fields that get converted to Date objects
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    
    // If time is 00:00:00.000, treat as date-only and use local date to avoid timezone shift
    if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // For datetime values, use ISO string
    return date.toISOString();
  }
  return date ? String(date) : null;
}

/**
 * Type for leave request day with potentially Date fields
 */
interface LeaveRequestDayInput {
  date: string | Date;
  createdAt?: Date | string;
  [key: string]: unknown;
}

/**
 * Type for approval with potentially Date fields
 */
interface ApprovalInput {
  createdAt?: Date | string;
  decidedAt?: Date | string | null;
  [key: string]: unknown;
}

/**
 * Type for leave request input with potentially Date fields
 */
export interface LeaveRequestInput {
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  fromDate?: string | Date | null;
  toDate?: string | Date | null;
  leaveDays?: LeaveRequestDayInput[];
  approvals?: ApprovalInput[];
  [key: string]: unknown;
}

/**
 * Transforms leave request dates to strings for client-side serialization
 * Converts all Date objects to ISO strings while preserving other data
 * 
 * This function is used to convert server-side Date objects to strings
 * for serialization to client components. The return type preserves all
 * fields from the input object while converting date fields to strings.
 * 
 * @param leaveRequest - Leave request object with potentially Date fields
 * @returns Leave request with all dates converted to strings, preserving all other fields
 */
export function transformLeaveRequestDates<T extends LeaveRequestInput>(leaveRequest: T): T & {
  createdAt: string | null;
  updatedAt: string | null;
  fromDate: string | null;
  toDate: string | null;
  leaveDays: Array<LeaveRequestDayInput & {
    date: string | null;
    createdAt: string | null;
  }>;
  approvals: Array<ApprovalInput & {
    createdAt: string | null;
    decidedAt: string | null;
  }>;
} {
  return {
    ...leaveRequest,
    createdAt: safeDateToString(leaveRequest.createdAt) ?? null,
    updatedAt: safeDateToString(leaveRequest.updatedAt) ?? null,
    fromDate: safeDateToString(leaveRequest.fromDate) ?? null,
    toDate: safeDateToString(leaveRequest.toDate) ?? null,
    leaveDays: leaveRequest.leaveDays?.map((day: LeaveRequestDayInput) => ({
      ...day,
      date: safeDateToString(day.date) ?? null,
      createdAt: safeDateToString(day.createdAt) ?? null,
    })) || [],
    approvals: leaveRequest.approvals?.map((approval: ApprovalInput) => ({
      ...approval,
      createdAt: safeDateToString(approval.createdAt) ?? null,
      decidedAt: safeDateToString(approval.decidedAt),
    })) || [],
  } as T & {
    createdAt: string | null;
    updatedAt: string | null;
    fromDate: string | null;
    toDate: string | null;
    leaveDays: Array<LeaveRequestDayInput & {
      date: string | null;
      createdAt: string | null;
    }>;
    approvals: Array<ApprovalInput & {
      createdAt: string | null;
      decidedAt: string | null;
    }>;
  };
}

/**
 * Transforms a simple leave request (without nested arrays) to strings
 * Used for list views
 * 
 * @param leaveRequest - Leave request object with potentially Date fields
 * @returns Leave request with dates converted to strings
 */
export function transformLeaveRequestDatesSimple(leaveRequest: LeaveRequestInput) {
  return {
    ...leaveRequest,
    createdAt: safeDateToString(leaveRequest.createdAt) ?? null,
    updatedAt: safeDateToString(leaveRequest.updatedAt) ?? null,
    fromDate: safeDateToString(leaveRequest.fromDate) ?? null,
    toDate: safeDateToString(leaveRequest.toDate) ?? null,
  };
}
