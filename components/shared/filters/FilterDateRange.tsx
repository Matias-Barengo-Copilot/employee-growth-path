'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRangeFilterConfig } from '@/lib/types/filters';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface FilterDateRangeProps {
  config: DateRangeFilterConfig;
  value?: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
}

// Helper para convertir Date a YYYY-MM-DD
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper para convertir YYYY-MM-DD a Date
function parseYYYYMMDD(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

export function FilterDateRange({ config, value, onChange }: FilterDateRangeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate initial date range from value - compute directly without useMemo
  const getInitialDateRange = (): DateRange | undefined => {
    return value?.from || value?.to
      ? {
          from: value.from ? parseYYYYMMDD(value.from) : undefined,
          to: value.to ? parseYYYYMMDD(value.to) : undefined,
        }
      : undefined;
  };

  const [tempRange, setTempRange] = useState<DateRange | undefined>(getInitialDateRange());

  // Sync tempRange with value when popover opens
  useEffect(() => {
    if (isOpen) {
      // Update tempRange directly when popover opens
      const initialRange = value?.from || value?.to
        ? {
            from: value.from ? parseYYYYMMDD(value.from) : undefined,
            to: value.to ? parseYYYYMMDD(value.to) : undefined,
          }
        : undefined;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempRange(initialRange);
    }
  }, [isOpen, value?.from, value?.to]);

  const handleSelect = (range: DateRange | undefined) => {
    setTempRange(range);
  };

  const handleApply = () => {
    if (!tempRange || (!tempRange.from && !tempRange.to)) {
      onChange({ from: '', to: '' });
    } else {
      onChange({
        from: tempRange.from ? formatDateToYYYYMMDD(tempRange.from) : '',
        to: tempRange.to ? formatDateToYYYYMMDD(tempRange.to) : '',
      });
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempRange(undefined);
    onChange({ from: '', to: '' });
    setIsOpen(false);
  };

  const displayValue = () => {
    if (!value?.from && !value?.to) return config.placeholder || 'Select date range';
    if (value.from && value.to) {
      return `${value.from} - ${value.to}`;
    }
    if (value.from) return `From ${value.from}`;
    if (value.to) return `Until ${value.to}`;
    return config.placeholder || 'Select date range';
  };

  const hasSelection = tempRange && (tempRange.from || tempRange.to);
  const hasValue = value && (value.from || value.to);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full min-w-[240px] justify-start text-left font-normal',
            !hasValue && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-8"
              disabled={!hasSelection}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
