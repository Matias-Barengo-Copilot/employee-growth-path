'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterConfig, FilterValues } from '@/lib/types/filters';

interface UseFiltersOptions {
  filters: FilterConfig[];
  onFiltersChange?: (filters: FilterValues) => void;
  resetPaginationOnChange?: boolean; // Si true, resetea a página 1 cuando cambian filtros
}

/**
 * Hook para manejar filtros con sincronización de query params
 * Compatible con usePagination - resetea paginación cuando cambian filtros
 */
export function useFilters(options: UseFiltersOptions) {
  const { filters, onFiltersChange, resetPaginationOnChange = true } = options;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to extract values from searchParams string
  const extractValuesFromParamsString = useCallback((paramsString: string): FilterValues => {
    const values: FilterValues = {};
    const params = new URLSearchParams(paramsString);
    
    filters.forEach((filter) => {
      if (filter.type === 'date-range') {
        const from = params.get(filter.fromKey);
        const to = params.get(filter.toKey);
        if (from || to) {
          values[filter.key] = { from: from || '', to: to || '' };
        }
      } else if (filter.type === 'select-multi') {
        const param = params.get(filter.key);
        if (param) {
          values[filter.key] = param.split(',').filter(Boolean);
        }
      } else {
        const param = params.get(filter.key);
        if (param) {
          values[filter.key] = param;
        }
      }
    });

    return values;
  }, [filters]);

  // Use searchParams.toString() for stable comparison
  const searchParamsString = searchParams.toString();
  const [filterValues, setFilterValues] = useState<FilterValues>(() => extractValuesFromParamsString(searchParamsString));
  const prevSearchParamsRef = useRef<string>(searchParamsString);

  // Sincronizar con query params cuando cambian
  useEffect(() => {
    // Only sync if searchParams actually changed
    if (prevSearchParamsRef.current === searchParamsString) {
      return;
    }
    
    prevSearchParamsRef.current = searchParamsString;
    const newValues = extractValuesFromParamsString(searchParamsString);
    
    // Use setTimeout to defer state update and avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setFilterValues(newValues);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [searchParamsString, extractValuesFromParamsString]);

  const updateQueryParams = useCallback(
    (newValues: FilterValues) => {
      const params = new URLSearchParams(searchParamsString);
      
      // Limpiar filtros existentes
      filters.forEach((filter) => {
        if (filter.type === 'date-range') {
          params.delete(filter.fromKey);
          params.delete(filter.toKey);
        } else {
          params.delete(filter.key);
        }
      });

      // Agregar nuevos valores
      Object.entries(newValues).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }

        const filter = filters.find((f) => f.key === key);
        if (!filter) return;

        if (filter.type === 'date-range') {
          const dateRange = value as { from: string; to: string };
          if (dateRange.from) params.set(filter.fromKey, dateRange.from);
          if (dateRange.to) params.set(filter.toKey, dateRange.to);
        } else if (filter.type === 'select-multi') {
          const multiValue = value as string[];
          if (multiValue.length > 0) {
            params.set(filter.key, multiValue.join(','));
          }
        } else {
          // Don't add 'all' value to query params (treat as "show all")
          if (value !== 'all') {
            params.set(filter.key, value as string);
          }
        }
      });

      // Resetear paginación si está habilitado
      if (resetPaginationOnChange) {
        params.set('page', '1');
      }

      const newParamsString = params.toString();
      // Only update if params actually changed to prevent infinite loops
      if (newParamsString !== searchParamsString) {
        router.push(`?${newParamsString}`, { scroll: false });
        onFiltersChange?.(newValues);
      }
    },
    [filters, searchParamsString, router, onFiltersChange, resetPaginationOnChange]
  );

  const handleFilterChange = useCallback(
    (key: string, value: string | string[] | { from: string; to: string } | undefined) => {
      // Check if value actually changed
      const currentValue = filterValues[key];
      const currentValueString = JSON.stringify(currentValue);
      const newValueString = JSON.stringify(value);
      
      if (currentValueString === newValueString) {
        return; // No change, skip update
      }
      
      const newValues = { ...filterValues, [key]: value };
      setFilterValues(newValues);
      updateQueryParams(newValues);
    },
    [filterValues, updateQueryParams]
  );

  const clearFilters = useCallback(() => {
    const emptyValues: FilterValues = {};
    filters.forEach((filter) => {
      if (filter.type === 'date-range') {
        emptyValues[filter.key] = { from: '', to: '' };
      } else if (filter.type === 'select-multi') {
        emptyValues[filter.key] = [];
      } else {
        emptyValues[filter.key] = undefined;
      }
    });
    setFilterValues(emptyValues);
    updateQueryParams(emptyValues);
  }, [filters, updateQueryParams]);

  const hasActiveFilters = useCallback(() => {
    return Object.values(filterValues).some((value) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && 'from' in value) {
        return value.from !== '' || value.to !== '';
      }
      return true;
    });
  }, [filterValues]);

  return {
    filterValues,
    handleFilterChange,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
  };
}
