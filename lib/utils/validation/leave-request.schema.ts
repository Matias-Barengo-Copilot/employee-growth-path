import { z } from 'zod';
import { parseLocalDate } from '@/lib/utils/date';

// Frontend schema - more permissive to allow form submission
// Backend will validate strictly
const LeaveRequestProjectFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(255, "Project name is too long"),
  pmId: z.string().optional(), // Frontend allows optional, backend will validate
  techLeadId: z.string().optional(), // Frontend allows optional, backend will validate
});

export const leaveRequestDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Invalid date format. Use YYYY-MM-DD',
  }),
  leaveType: z.enum(['vacation', 'personal_sick', 'unpaid', 'other'], {
    message: 'Leave type is required',
  }),
  isHalfDay: z.boolean(),
  halfDayPeriod: z.enum(['morning', 'afternoon']).optional(),
});

export const leaveRequestFormSchema = z.object({
  leaveDays: z
    .array(leaveRequestDaySchema)
    .min(1, {
      message: 'At least one leave day is required',
    }),
  reason: z.string().optional(),
  projects: z
    .array(LeaveRequestProjectFormSchema)
    .min(1, {
      message: 'At least one project is required',
    }),
}).refine((data) => {
  const weekendDays = data.leaveDays.filter(day => {
    const date = parseLocalDate(day.date);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  });
  
  if (weekendDays.length > 0) {
    const weekendDates = weekendDays.map(day => {
      const date = parseLocalDate(day.date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      return `${day.date} (${dayName})`;
    }).join(', ');
    
    throw new z.ZodError([{
      code: 'custom',
      path: ['leaveDays'],
      message: `Weekends are not allowed for leave requests. Invalid dates: ${weekendDates}`,
    }]);
  }
  
  return true;
}, {
  message: 'Weekends are not allowed for leave requests',
  path: ['leaveDays'],
}).refine((data) => {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const futureDays = data.leaveDays.filter(day => {
    const date = parseLocalDate(day.date);
    return date > maxDate;
  });
  
  if (futureDays.length > 0) {
    const futureDates = futureDays.map(day => day.date).join(', ');
    throw new z.ZodError([{
      code: 'custom',
      path: ['leaveDays'],
      message: `Leave dates cannot be more than 1 year in the future. Invalid dates: ${futureDates}`,
    }]);
  }
  
  return true;
}, {
  message: 'Leave dates cannot be more than 1 year in the future',
  path: ['leaveDays'],
});

export type LeaveRequestFormData = z.infer<typeof leaveRequestFormSchema>;

