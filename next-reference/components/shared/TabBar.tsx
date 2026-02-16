'use client';

import { Badge } from '@/components/ui/badge';

export interface TabDefinition<T extends string = string> {
  key: T;
  label: string;
  count?: number;
}

interface TabBarProps<T extends string = string> {
  tabs: TabDefinition<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  testIdPrefix?: string;
}

export function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  testIdPrefix = 'tab',
}: TabBarProps<T>) {
  return (
    <div className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === tab.key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground'
          }`}
          onClick={() => onTabChange(tab.key)}
          data-testid={`${testIdPrefix}-${tab.key}`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <Badge
              variant="default"
              className="no-default-hover-elevate no-default-active-elevate text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center"
            >
              {tab.count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
