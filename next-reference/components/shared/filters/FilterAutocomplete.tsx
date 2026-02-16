'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutocompleteFilterConfig } from '@/lib/types/filters';
import { Loader2, ChevronsUpDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterAutocompleteProps {
  config: AutocompleteFilterConfig;
  value?: string;
  onChange: (value: string) => void;
}

interface AutocompleteOption {
  id: string;
  name: string;
  [key: string]: unknown;
}

export function FilterAutocomplete({ config, value, onChange }: FilterAutocompleteProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = new URL(config.fetchOptions, window.location.origin);
      url.searchParams.set('limit', '100');

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data) {
          if (data.data.data && Array.isArray(data.data.data)) {
            setOptions(data.data.data as AutocompleteOption[]);
          } else if (Array.isArray(data.data)) {
            setOptions(data.data as AutocompleteOption[]);
          } else {
            setOptions([]);
          }
        } else {
          setOptions([]);
        }
      } else {
        setOptions([]);
      }
    } catch (error) {
      console.error('Error fetching autocomplete options:', error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [config.fetchOptions]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredOptions(
        options.filter((opt) => {
          const label = getLabel(opt).toLowerCase();
          return label.includes(term);
        })
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, options]);

  const getLabel = (item: AutocompleteOption): string => {
    if (config.optionLabel) {
      return config.optionLabel(item);
    }
    const name = typeof item.name === 'string' ? item.name : '';
    const label = typeof item.label === 'string' ? item.label : '';
    return name || label || item.id || '';
  };

  const getValue = (item: AutocompleteOption) => {
    if (config.optionValue) {
      return config.optionValue(item);
    }
    return item.id;
  };

  const selectedOption = value ? options.find((o) => getValue(o) === value) : null;
  const displayText = selectedOption ? getLabel(selectedOption) : (config.placeholder || `Select ${config.label}`);

  const handleSelect = (optionValue: string) => {
    if (value === optionValue) {
      onChange('');
    } else {
      onChange(optionValue);
    }
    setOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="w-full min-w-[200px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            data-testid={`filter-autocomplete-${config.key}`}
          >
            <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
              {displayText}
            </span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {value && (
                <X
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
              data-testid={`filter-autocomplete-search-${config.key}`}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optValue = getValue(option);
                const isSelected = value === optValue;
                return (
                  <button
                    key={optValue}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover-elevate cursor-pointer",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => handleSelect(optValue)}
                    data-testid={`filter-option-${optValue}`}
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{getLabel(option)}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
