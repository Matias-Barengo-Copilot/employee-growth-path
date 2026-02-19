'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectMultiFilterConfig, FilterOption } from '@/lib/types/filters';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterSelectMultiProps {
  config: SelectMultiFilterConfig;
  value?: string[];
  onChange: (value: string[]) => void;
}

export function FilterSelectMulti({ config, value = [], onChange }: FilterSelectMultiProps) {
  const options = config.options.map((opt): FilterOption => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) };
    }
    return opt;
  });

  const CLEAR_VALUE = '__clear_all__';

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === CLEAR_VALUE) {
      onChange([]);
      return;
    }

    if (value.includes(selectedValue)) {
      onChange(value.filter((v) => v !== selectedValue));
    } else {
      onChange([...value, selectedValue]);
    }
  };

  const removeItem = (itemToRemove: string) => {
    onChange(value.filter((v) => v !== itemToRemove));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  return (
    <div className="w-full min-w-[200px]">
      <Select value={undefined} onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={config.placeholder || `Select ${config.label}`} />
        </SelectTrigger>
        <SelectContent>
          {config.allowClear && value.length > 0 && (
            <SelectItem value={CLEAR_VALUE}>Clear all</SelectItem>
          )}
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={value.includes(option.value)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary" className="gap-1">
              {option.label}
              <button
                type="button"
                onClick={() => removeItem(option.value)}
                className="ml-1 rounded-full hover:bg-secondary-foreground/20"
                aria-label={`Remove ${option.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
