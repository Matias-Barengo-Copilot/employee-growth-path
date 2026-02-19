'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem } from './NavItem';
import type { NavigationItem } from '@/lib/types/navigation';

interface NavItemGroupProps {
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
  isCollapsed: boolean;
}

export function NavItemGroup({ label, icon: Icon, items, isCollapsed }: NavItemGroupProps) {
  const pathname = usePathname();
  const isAnyChildActive = items.some((child) =>
    child.exactMatch ? pathname === child.href : pathname.startsWith(child.href)
  );
  const [isOpen, setIsOpen] = useState(isAnyChildActive);

  useEffect(() => {
    if (isAnyChildActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [isAnyChildActive]);

  if (isCollapsed) {
    const activeChild = items.find((child) =>
      child.exactMatch ? pathname === child.href : pathname.startsWith(child.href)
    );
    return (
      <NavItem
        label={label}
        href={items[0]?.href || '/'}
        icon={Icon}
        isActive={isAnyChildActive}
        isCollapsed={true}
        badge={activeChild?.badge}
      />
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full',
          'transition-colors duration-200',
          'hover:bg-accent/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          isAnyChildActive
            ? 'text-accent font-semibold'
            : 'text-slate-600 hover:text-accent'
        )}
        data-testid={`button-nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <ul className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-2">
          {items.map((child, index) => (
            <li key={`${child.href}-${child.label}-${index}`}>
              <NavItem
                {...child}
                isActive={child.exactMatch ? pathname === child.href : pathname.startsWith(child.href)}
                isCollapsed={false}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
