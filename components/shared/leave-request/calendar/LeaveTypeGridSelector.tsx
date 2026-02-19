'use client';

import { LeaveType } from '@/lib/types';
import { LEAVE_TYPE_CONFIG } from '@/lib/types/leave-calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface LeaveTypeOption {
  leaveType: LeaveType;
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  code: string;
  label: string;
}

/**
 * Generate all possible leave type options (12 total: 4 types × 3 states)
 */
function generateLeaveTypeOptions(): LeaveTypeOption[] {
  const options: LeaveTypeOption[] = [];
  const leaveTypes: LeaveType[] = ['vacation', 'personal_sick', 'unpaid', 'other'];

  leaveTypes.forEach((leaveType) => {
    const config = LEAVE_TYPE_CONFIG[leaveType];
    
    // Half day morning
    options.push({
      leaveType,
      isHalfDay: true,
      halfDayPeriod: 'morning',
      code: config.codes.halfMorning,
      label: `${config.shortLabel} - Half Day Morning`,
    });

    // Half day afternoon
    options.push({
      leaveType,
      isHalfDay: true,
      halfDayPeriod: 'afternoon',
      code: config.codes.halfAfternoon,
      label: `${config.shortLabel} - Half Day Afternoon`,
    });

    // Full day
    options.push({
      leaveType,
      isHalfDay: false,
      halfDayPeriod: undefined,
      code: config.codes.full,
      label: `${config.shortLabel} - Full Day`,
    });
  });

  return options;
}

interface LeaveTypeGridSelectorProps {
  selectedOption?: {
    leaveType: LeaveType;
    isHalfDay: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
  };
  onSelect: (option: LeaveTypeOption) => void;
  onClear?: () => void;
  className?: string;
}

/**
 * Leave Type Grid Selector Component
 * Displays all leave type options in a 3-column grid
 * Used in calendar day dropdowns
 */
export function LeaveTypeGridSelector({
  selectedOption,
  onSelect,
  onClear,
  className,
}: LeaveTypeGridSelectorProps) {
  const options = generateLeaveTypeOptions();

  const isSelected = (option: LeaveTypeOption): boolean => {
    if (!selectedOption) return false;
    return (
      selectedOption.leaveType === option.leaveType &&
      selectedOption.isHalfDay === option.isHalfDay &&
      selectedOption.halfDayPeriod === option.halfDayPeriod
    );
  };

  const getColorClasses = (leaveType: LeaveType): string => {
    // Use the same color for all options of the same leave type (including half-days)
    switch (leaveType) {
      case 'vacation':
        return 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100';
      case 'personal_sick':
        return 'bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100';
      case 'unpaid':
        return 'bg-accent/10 border-accent text-accent hover:bg-accent/20';
      case 'other':
        return 'bg-accent/10 border-accent text-accent hover:bg-accent/20';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Grid of options - 3 columns */}
      <div className="grid grid-cols-3 gap-2 p-2">
        {options.map((option) => {
          const selected = isSelected(option);

          return (
            <button
              key={`${option.leaveType}-${option.isHalfDay}-${option.halfDayPeriod || 'full'}`}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-md border-2 transition-all',
                'min-h-[60px] text-xs font-medium',
                getColorClasses(option.leaveType),
                selected && 'ring-2 ring-offset-2 ring-accent border-accent',
                !selected && 'hover:scale-105'
              )}
              title={option.label}
            >
              {/* Code (v1, v2, v, p1, p2, p, etc.) */}
              <span className="text-lg font-bold mb-1">{option.code}</span>
              {/* Description */}
              <span className="text-[10px] text-center leading-tight">
                {option.isHalfDay
                  ? option.halfDayPeriod === 'morning'
                    ? 'Morning'
                    : 'Afternoon'
                  : 'Full Day'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {selectedOption && onClear && (
        <div className="px-2 pb-2 border-t pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            className="w-full"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
}
