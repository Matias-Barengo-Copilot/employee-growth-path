'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectFilterConfig, FilterOption } from '@/lib/types/filters';

interface FilterSelectProps {
  config: SelectFilterConfig;
  value?: string;
  onChange: (value: string) => void;
}

const CLEAR_VALUE = '__clear__';

export function FilterSelect({ config, value, onChange }: FilterSelectProps) {
  const options = config.options.map((opt): FilterOption => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) };
    }
    return opt;
  });

  // If no value and first option is 'all', use 'all' as default
  const firstOptionIsAll = options[0]?.value === 'all';
  const displayValue = value || (firstOptionIsAll ? 'all' : undefined);

  const handleValueChange = (newValue: string) => {
    if (newValue === CLEAR_VALUE) {
      onChange('');
    } else {
      onChange(newValue);
    }
  };

  return (
    <Select value={displayValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full min-w-[150px]">
        <SelectValue placeholder={config.placeholder || `Select ${config.label}`} />
      </SelectTrigger>
      <SelectContent>
        {config.allowClear && (
          <SelectItem value={CLEAR_VALUE}>All {config.label}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
