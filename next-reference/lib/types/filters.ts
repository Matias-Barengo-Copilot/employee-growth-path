/**
 * Filter Configuration Types
 * Define los tipos de filtros disponibles y su configuración
 */

export type FilterType = 
  | 'select'        // Dropdown simple (status, role, leaveType)
  | 'select-multi'  // Dropdown múltiple
  | 'date-range'    // Rango de fechas (fromDate, toDate)
  | 'autocomplete'  // Búsqueda con autocompletado (employee, company)
  | 'text-search';  // Búsqueda por texto (name, email)

export interface FilterOption {
  value: string;
  label: string;
}

export interface BaseFilterConfig {
  key: string;
  type: FilterType;
  label: string;
  placeholder?: string;
  visibleForRoles?: string[]; // Si se especifica, solo visible para estos roles
}

export interface SelectFilterConfig extends BaseFilterConfig {
  type: 'select';
  options: FilterOption[] | string[]; // Puede ser array de strings o de objetos {value, label}
  allowClear?: boolean;
}

export interface SelectMultiFilterConfig extends BaseFilterConfig {
  type: 'select-multi';
  options: FilterOption[] | string[];
  allowClear?: boolean;
}

export interface DateRangeFilterConfig extends BaseFilterConfig {
  type: 'date-range';
  fromKey: string; // Key para fecha inicio (ej: 'fromDate')
  toKey: string;   // Key para fecha fin (ej: 'toDate')
}

export interface AutocompleteFilterConfig<TItem extends { id: string; [key: string]: unknown } = { id: string; name?: string; email?: string; [key: string]: unknown }> extends BaseFilterConfig {
  type: 'autocomplete';
  fetchOptions: string; // Endpoint para obtener opciones
  optionLabel?: (item: TItem) => string; // Función para obtener label del item
  optionValue?: (item: TItem) => string; // Función para obtener value del item
}

export interface TextSearchFilterConfig extends BaseFilterConfig {
  type: 'text-search';
  debounceMs?: number; // Tiempo de debounce en ms (default: 300)
}

export type FilterConfig = 
  | SelectFilterConfig
  | SelectMultiFilterConfig
  | DateRangeFilterConfig
  | AutocompleteFilterConfig
  | TextSearchFilterConfig;

export interface FilterValues {
  [key: string]: string | string[] | { from: string; to: string } | undefined;
}
