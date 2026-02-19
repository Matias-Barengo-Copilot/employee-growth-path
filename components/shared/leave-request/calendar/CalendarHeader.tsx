'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onClearAll?: () => void;
}

/**
 * Calendar Header Component
 * Navigation controls for the calendar
 */
export function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onClearAll,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onPreviousMonth}
            className="h-9 w-9"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onNextMonth}
            className="h-9 w-9"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onToday}
          className="w-full sm:w-auto gap-2"
        >
          <Calendar className="h-4 w-4" />
          Today
        </Button>
        {onClearAll && (
          <Button
            type="button"
            variant="outline"
            onClick={onClearAll}
            className="w-full sm:w-auto gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
