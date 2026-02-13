'use client';

import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { LeaveCalendarDay, formatDateToString } from '@/lib/types/leave-calendar';
import { LeaveType } from '@/lib/types';
import { CalendarHeader } from './CalendarHeader';
import { CalendarDay } from './CalendarDay';
import { LeaveTypeLegend } from './LeaveTypeLegend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateWorkingDays, calculateHalfDaysCount } from '@/lib/types/leave-calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface LeaveCalendarProps {
  selectedDays: LeaveCalendarDay[];
  onDaysChange: (days: LeaveCalendarDay[]) => void;
  disabled?: boolean;
}

/**
 * Leave Calendar Component
 * Interactive calendar for selecting individual leave days
 * Each date has a dropdown with a 3-column grid of leave type options
 */
export function LeaveCalendar({
  selectedDays,
  onDaysChange,
  disabled = false,
}: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate calendar days (including adjacent month days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Navigation handlers
  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());
  const handleClearAll = () => {
    onDaysChange([]);
  };

  // Handle day selection from dropdown
  const handleDaySelect = (day: LeaveCalendarDay) => {
    const existingIndex = selectedDays.findIndex((d) => d.date === day.date);
    let updatedDays: LeaveCalendarDay[];

    if (existingIndex >= 0) {
      // Update existing day
      updatedDays = [...selectedDays];
      updatedDays[existingIndex] = day;
    } else {
      // Add new day
      updatedDays = [...selectedDays, day];
    }

    // Sort by date
    updatedDays.sort((a, b) => a.date.localeCompare(b.date));
    onDaysChange(updatedDays);
  };

  // Handle day clear
  const handleDayClear = (dateString: string) => {
    const updatedDays = selectedDays.filter((d) => d.date !== dateString);
    onDaysChange(updatedDays);
  };

  // Calculate statistics
  const totalWorkingDays = useMemo(() => calculateWorkingDays(selectedDays), [selectedDays]);
  const totalHalfDays = useMemo(() => calculateHalfDaysCount(selectedDays), [selectedDays]);

  // Count by leave type
  const leaveTypeCounts = useMemo(() => {
    const counts: Record<LeaveType, number> = {
      vacation: 0,
      personal_sick: 0,
      unpaid: 0,
      other: 0,
    };
    selectedDays.forEach((day) => {
      if (!day.isHalfDay) {
        counts[day.leaveType]++;
      }
    });
    return counts;
  }, [selectedDays]);

  // totalHalfDays is already calculated above using calculateHalfDaysCount

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Calendar with Summary */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Leave Days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CalendarHeader
              currentDate={currentDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              onClearAll={handleClearAll}
            />

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const dateString = formatDateToString(date);
                const selectedDay = selectedDays.find((d) => d.date === dateString);
                
                return (
                  <CalendarDay
                    key={dateString}
                    date={date}
                    currentMonth={currentDate}
                    selectedDay={selectedDay}
                    sequenceNumber={0} // No longer used with new dropdown system
                    onSelect={handleDaySelect}
                    onClear={handleDayClear}
                    disabled={disabled}
                  />
                );
              })}
            </div>

            {/* Leave Summary - Moved below calendar */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Leave Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Applied</p>
                  <p className="text-xl font-semibold">
                    {totalWorkingDays > 0 ? `${totalWorkingDays} ${totalWorkingDays === 1 ? 'day' : 'days'}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Personal/Sick</p>
                  <p className="text-lg font-medium">
                    {leaveTypeCounts.personal_sick > 0 ? `${leaveTypeCounts.personal_sick}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Vacation</p>
                  <p className="text-lg font-medium">
                    {leaveTypeCounts.vacation > 0 ? `${leaveTypeCounts.vacation}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Unpaid</p>
                  <p className="text-lg font-medium">
                    {leaveTypeCounts.unpaid > 0 ? `${leaveTypeCounts.unpaid}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Other</p>
                  <p className="text-lg font-medium">
                    {leaveTypeCounts.other > 0 ? `${leaveTypeCounts.other}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Half Days</p>
                  <p className="text-lg font-medium">
                    {totalHalfDays > 0 ? `${totalHalfDays}` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Information Panels */}
      <div className="space-y-6">
        {/* How to use */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Click on any date to select your leave type:
            </p>
            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
              <li>Choose from Vacation, Personal/Sick, Unpaid, or Other</li>
              <li>Select Morning, Afternoon, or Full Day for each date</li>
              <li>Click &quot;Clear Selection&quot; to remove a selected date</li>
              <li>Use &quot;Clear All&quot; button to remove all selections</li>
            </ul>
          </CardContent>
        </Card>

        {/* References Legend */}
        <LeaveTypeLegend />
      </div>
    </div>
  );
}
