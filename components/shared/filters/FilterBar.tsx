'use client';

import { FilterConfig } from '@/lib/types/filters';
import { FilterSelect } from './FilterSelect';
import { FilterSelectMulti } from './FilterSelectMulti';
import { FilterTextSearch } from './FilterTextSearch';
import { FilterDateRange } from './FilterDateRange';
import { FilterAutocomplete } from './FilterAutocomplete';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useFilters } from '@/lib/hooks/useFilters';

interface FilterBarProps {
  filters: FilterConfig[];
  userRole?: string;
  onFiltersChange?: (filters: Record<string, unknown>) => void;
}

/**
 * FilterBar Component
 * Componente genérico y reutilizable para mostrar filtros
 * Compatible con paginado - resetea a página 1 cuando cambian filtros
 */
export function FilterBar({ filters, userRole, onFiltersChange }: FilterBarProps) {
  const { filterValues, handleFilterChange, clearFilters, hasActiveFilters } = useFilters({
    filters,
    onFiltersChange,
    resetPaginationOnChange: true,
  });

  // Filtrar filtros visibles según rol
  const visibleFilters = filters.filter((filter) => {
    if (!filter.visibleForRoles) return true;
    return userRole && filter.visibleForRoles.includes(userRole);
  });

  if (visibleFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border rounded-lg bg-muted/30">
      {visibleFilters.map((filter) => {
        const value = filterValues[filter.key];

        if (filter.type === 'select') {
          return (
            <div key={filter.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              <FilterSelect
                config={filter}
                value={value as string | undefined}
                onChange={(val) => handleFilterChange(filter.key, val || undefined)}
              />
            </div>
          );
        }

        if (filter.type === 'text-search') {
          return (
            <div key={filter.key} className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              <FilterTextSearch
                config={filter}
                value={value as string | undefined}
                onChange={(val) => handleFilterChange(filter.key, val || undefined)}
              />
            </div>
          );
        }

        if (filter.type === 'date-range') {
          return (
            <div key={filter.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              <FilterDateRange
                config={filter}
                value={value as { from: string; to: string } | undefined}
                onChange={(val) => handleFilterChange(filter.key, val)}
              />
            </div>
          );
        }

        if (filter.type === 'select-multi') {
          return (
            <div key={filter.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              <FilterSelectMulti
                config={filter}
                value={value as string[] | undefined}
                onChange={(val) => handleFilterChange(filter.key, val)}
              />
            </div>
          );
        }

        if (filter.type === 'autocomplete') {
          return (
            <div key={filter.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {filter.label}
              </label>
              <FilterAutocomplete
                config={filter}
                value={value as string | undefined}
                onChange={(val) => handleFilterChange(filter.key, val || undefined)}
              />
            </div>
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
