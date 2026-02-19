'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { TextSearchFilterConfig } from '@/lib/types/filters';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterTextSearchProps {
  config: TextSearchFilterConfig;
  value?: string;
  onChange: (value: string) => void;
}

export function FilterTextSearch({ config, value = '', onChange }: FilterTextSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceMs = config.debounceMs || 300;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
    // Note: onChange is intentionally excluded to prevent re-triggering on every parent re-render
    // The parent component should memoize onChange with useCallback if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, debounceMs]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative w-full min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={config.placeholder || `Search ${config.label.toLowerCase()}...`}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
