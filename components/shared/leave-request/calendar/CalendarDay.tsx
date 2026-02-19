'use client';

import { useState } from 'react';
import { format, isToday, isSameMonth } from 'date-fns';
import { LeaveCalendarDay, isWeekend, formatDateToString, getLeaveTypeCode } from '@/lib/types/leave-calendar';
import { LeaveType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LeaveTypeGridSelector, LeaveTypeOption } from './LeaveTypeGridSelector';

interface CalendarDayProps {
  date: Date;
  currentMonth: Date;
  selectedDay?: LeaveCalendarDay;
  sequenceNumber?: number;
  onSelect: (day: LeaveCalendarDay) => void;
  onClear?: (date: string) => void;
  disabled?: boolean;
}

/**
 * Get the code for a leave type (v1, v2, v, p1, p2, p, etc.)
 */
function getLeaveTypeDisplayCode(
  leaveType: string,
  isHalfDay: boolean,
  halfDayPeriod?: 'morning' | 'afternoon'
): string {
  return getLeaveTypeCode(
    leaveType as LeaveType,
    isHalfDay,
    halfDayPeriod
  );
}

/**
 * Get the color classes for a leave type badge
 * Uses the same color for all options of the same leave type (including half-days)
 */
function getLeaveTypeBadgeColorClasses(leaveType: string): string {
  // Use the same color for all options of the same leave type (including half-days)
  switch (leaveType) {
    case 'personal_sick':
      return 'bg-pink-100 text-pink-700 border-pink-300';
    case 'vacation':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'unpaid':
      return 'bg-accent/10 text-accent border-accent';
    case 'other':
      return 'bg-accent/10 text-accent border-accent';
    default:
      return '';
  }
}

/**
 * Calendar Day Component
 * Individual day cell in the calendar grid
 * Shows leave type code (v1, v2, v, p1, p2, p, etc.) as a small badge below the date
 * Includes dropdown with LeaveTypeGridSelector for selecting leave type
 */
export function CalendarDay({
  date,
  currentMonth,
  selectedDay,
  sequenceNumber = 0,
  onSelect,
  onClear,
  disabled = false,
}: CalendarDayProps) {
  const dateString = formatDateToString(date);
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isCurrentDay = isToday(date);
  const isWeekendDay = isWeekend(date);
  const isDisabled = disabled || isWeekendDay; // Past dates are now allowed
  const isSelected = selectedDay !== undefined;

  const displayCode = selectedDay
    ? getLeaveTypeDisplayCode(
        selectedDay.leaveType,
        selectedDay.isHalfDay,
        selectedDay.halfDayPeriod
      )
    : '';
  const badgeColorClasses = selectedDay
    ? getLeaveTypeBadgeColorClasses(selectedDay.leaveType)
    : '';

  const [isOpen, setIsOpen] = useState(false);

  const handleSelectOption = (option: LeaveTypeOption) => {
    onSelect({
      date: dateString,
      leaveType: option.leaveType,
      isHalfDay: option.isHalfDay,
      halfDayPeriod: option.halfDayPeriod,
    });
    setIsOpen(false); // Close popover after selection
  };

  const handleClear = () => {
    if (onClear) {
      onClear(dateString);
    }
    setIsOpen(false); // Close popover after clearing
  };

  const dayContent = (
    <div
      className={cn(
        'relative w-full aspect-square flex flex-col items-center justify-start p-1.5 rounded-lg',
        'transition-all duration-200 border-2',
        'hover:bg-gray-50',
        isCurrentDay && !isSelected && 'bg-accent/10 border-accent/30',
        isSelected && 'bg-white border-accent',
        !isCurrentMonth && 'opacity-40',
        isDisabled && 'opacity-30 cursor-not-allowed bg-gray-100',
        !isSelected && !isDisabled && 'border-transparent hover:border-gray-200'
      )}
      title={
        selectedDay
          ? `${displayCode}${sequenceNumber > 0 ? sequenceNumber : ''} - ${
              selectedDay.isHalfDay
                ? `Half Day ${selectedDay.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon'}`
                : 'Full Day'
            }`
          : 'Click to select leave type'
      }
    >
      {/* Day Number */}
      <span
        className={cn(
          'text-sm font-medium mb-0.5',
          isCurrentDay && !isSelected && 'text-accent font-semibold',
          isSelected && 'text-gray-900 font-semibold',
          !isCurrentMonth && 'text-gray-400',
          !isSelected && 'text-gray-700'
        )}
      >
        {format(date, 'd')}
      </span>

      {/* Leave Type Badge - Small pill below the date */}
      {isSelected && displayCode && (
        <div className="w-full flex justify-center mt-auto">
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
              badgeColorClasses
            )}
          >
            {displayCode}
            {sequenceNumber > 0 ? sequenceNumber : ''}
          </span>
        </div>
      )}
    </div>
  );

  // If disabled, return non-interactive day
  if (isDisabled) {
    return dayContent;
  }

  // If enabled, wrap in Popover for dropdown
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative w-full aspect-square flex flex-col items-center justify-start p-1.5 rounded-lg',
            'transition-all duration-200 border-2',
            'hover:bg-gray-50',
            isCurrentDay && !isSelected && 'bg-accent/10 border-accent/30',
            isSelected && 'bg-white border-accent',
            !isCurrentMonth && 'opacity-40',
            !isSelected && 'border-transparent hover:border-gray-200',
            'cursor-pointer'
          )}
          title={
            selectedDay
              ? `${displayCode}${sequenceNumber > 0 ? sequenceNumber : ''} - ${
                  selectedDay.isHalfDay
                    ? `Half Day ${selectedDay.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon'}`
                    : 'Full Day'
                }`
              : 'Click to select leave type'
          }
        >
          {/* Day Number */}
          <span
            className={cn(
              'text-sm font-medium mb-0.5',
              isCurrentDay && !isSelected && 'text-accent font-semibold',
              isSelected && 'text-gray-900 font-semibold',
              !isCurrentMonth && 'text-gray-400',
              !isSelected && 'text-gray-700'
            )}
          >
            {format(date, 'd')}
          </span>

          {/* Leave Type Badge - Small pill below the date */}
          {isSelected && displayCode && (
            <div className="w-full flex justify-center mt-auto">
              <span
                className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                  badgeColorClasses
                )}
              >
                {displayCode}
                {sequenceNumber > 0 ? sequenceNumber : ''}
              </span>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        side="right"
        sideOffset={5}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <LeaveTypeGridSelector
          selectedOption={
            selectedDay
              ? {
                  leaveType: selectedDay.leaveType,
                  isHalfDay: selectedDay.isHalfDay,
                  halfDayPeriod: selectedDay.halfDayPeriod,
                }
              : undefined
          }
          onSelect={handleSelectOption}
          onClear={handleClear}
        />
      </PopoverContent>
    </Popover>
  );
}
