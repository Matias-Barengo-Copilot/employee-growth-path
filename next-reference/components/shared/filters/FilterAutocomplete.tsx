'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AutocompleteFilterConfig } from '@/lib/types/filters';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOptions = useCallback(async (search: string = '') => {
    setIsLoading(true);
    try {
      // Build URL with search parameter and limit for autocomplete
      const url = new URL(config.fetchOptions, window.location.origin);
      if (search) {
        url.searchParams.set('search', search);
      }
      // Set a higher limit for autocomplete to show more options
      url.searchParams.set('limit', '100');
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        
        // Standard API response format: { success: true, data: T }
        if (data.success && data.data) {
          // Handle paginated response structure: { data: { data: [...], pagination: {...} } }
          if (data.data.data && Array.isArray(data.data.data)) {
            setOptions(data.data.data as AutocompleteOption[]);
          } 
          // Handle simple array response: { data: [...] }
          else if (Array.isArray(data.data)) {
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

  return (
    <div className="w-full min-w-[200px]">
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={config.placeholder || `Select ${config.label}`} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                fetchOptions(e.target.value);
              }}
              className="h-8"
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : options.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No options found
            </div>
          ) : (
            options.map((option) => (
              <SelectItem key={getValue(option)} value={getValue(option)}>
                {getLabel(option)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
