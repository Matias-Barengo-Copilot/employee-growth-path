'use client';

import { LEAVE_TYPE_CONFIG } from '@/lib/types/leave-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Leave Type Legend Component
 * Displays reference guide for leave type codes
 * Shows to the right of the calendar
 */
export function LeaveTypeLegend() {
  const getColorClasses = (leaveType: string): string => {
    switch (leaveType) {
      case 'vacation':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'personal_sick':
        return 'bg-pink-100 border-pink-400 text-pink-800';
      case 'unpaid':
        return 'bg-accent/10 border-accent text-accent';
      case 'other':
        return 'bg-accent/10 border-accent text-accent';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getTextColor = (leaveType: string): string => {
    switch (leaveType) {
      case 'vacation':
        return 'text-green-700';
      case 'personal_sick':
        return 'text-pink-700';
      case 'unpaid':
        return 'text-accent';
      case 'other':
        return 'text-accent';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-semibold leading-tight">
          References
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 -mt-2">
        <div className="space-y-0">
          {Object.entries(LEAVE_TYPE_CONFIG).map(([key, config], index) => (
            <div
              key={key}
              className={cn(
                'grid grid-cols-4 gap-2 py-3',
                index < Object.entries(LEAVE_TYPE_CONFIG).length - 1 &&
                'border-b border-gray-100'
              )}
            >
              {/* Type */}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'w-9 h-9 rounded-md border-2 flex items-center justify-center text-base font-bold shadow-sm',
                    getColorClasses(key)
                  )}
                >
                  {config.codes.full}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold text-center',
                    getTextColor(key)
                  )}
                >
                  {config.shortLabel}
                </span>
              </div>

              {/* Morning */}
              <div className={cn('flex flex-col items-center justify-center', getTextColor(key))}>
                <span className="text-lg font-bold leading-none">
                  {config.codes.halfMorning}
                </span>
                <span className="text-[10px] mt-0.5 text-gray-600">
                  Morning
                </span>
              </div>

              {/* Afternoon */}
              <div className={cn('flex flex-col items-center justify-center', getTextColor(key))}>
                <span className="text-lg font-bold leading-none">
                  {config.codes.halfAfternoon}
                </span>
                <span className="text-[10px] mt-0.5 text-gray-600">
                  Afternoon
                </span>
              </div>

              {/* Full day */}
              <div className={cn('flex flex-col items-center justify-center', getTextColor(key))}>
                <span className="text-lg font-bold leading-none">
                  {config.codes.full}
                </span>
                <span className="text-[10px] mt-0.5 text-gray-600">
                  Full
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
