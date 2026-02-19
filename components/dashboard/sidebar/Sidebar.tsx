'use client';

import { useState, useEffect, startTransition } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { UserRole } from '@/lib/types/navigation';
import { getNavigationItemsByRole } from '@/lib/constants/navigation';
import { NavItem } from './NavItem';
import { NavItemGroup } from './NavItemGroup';
import { MobileMenuButton } from './MobileMenuButton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  /** User role to determine which navigation items to show */
  userRole: UserRole;
  /** Whether user can view all company leave requests (shows "All Leave Requests" tab) */
  canViewAllLeaveRequests?: boolean;
}

/**
 * Navigation sidebar component
 * Handles desktop collapsible sidebar and mobile drawer
 * 
 * Features:
 * - Desktop: Fixed sidebar that can collapse/expand
 * - Mobile: Drawer that slides in from the left
 * - Role-based navigation items
 * - Active route highlighting
 * - Smooth animations and transitions
 * 
 * @example
 * ```tsx
 * <Sidebar userRole="employee" />
 * ```
 */
export function Sidebar({ userRole, canViewAllLeaveRequests = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const navigationItems = getNavigationItemsByRole(userRole, { canViewAllLeaveRequests });

  // Close mobile drawer on route change
  useEffect(() => {
    startTransition(() => {
      setIsMobileOpen(false);
    });
  }, [pathname]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Desktop sidebar
  const desktopSidebar = (
    <div className="hidden md:block relative">
      <aside
        className={cn(
          'flex flex-col fixed top-0 bottom-0 left-0 z-50',
          'bg-white border-r border-slate-200',
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
        aria-label="Main navigation"
      >
        {/* Sidebar header */}
        <header className="flex items-center border-b border-slate-200 h-16 shrink-0">
          <div className="flex items-center flex-1 px-4 gap-3">
            <Image
              src="/copilot-logo.svg"
              alt="CoPilot LMS"
              width={38}
              height={38}
              className={cn(
                "transition-all duration-300 shrink-0",
                isCollapsed ? "h-8 w-8 mx-auto" : "h-9 w-9"
              )}
              priority
            />
            {!isCollapsed && (
              <div className="flex flex-col justify-center">
                <span className="font-semibold text-black leading-tight">Copilot</span>
                <span className="font-semibold text-black leading-tight">Innovations</span>
              </div>
            )}
          </div>
        </header>

        {/* Navigation items - Scrollable area */}
        <nav 
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4"
          aria-label="Main navigation"
        >
          <ul className="space-y-1">
            {navigationItems.map((item, index) => (
              <li key={`${item.href}-${item.label}-${index}`}>
                {item.children && item.children.length > 0 ? (
                  <NavItemGroup
                    label={item.label}
                    icon={item.icon}
                    items={item.children}
                    isCollapsed={isCollapsed}
                  />
                ) : (
                  <NavItem
                    {...item}
                    isActive={item.exactMatch ? pathname === item.href : pathname.startsWith(item.href)}
                    isCollapsed={isCollapsed}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Toggle button - Semicircular button on the edge, aligned with logo */}
      <button
        onClick={toggleCollapse}
        className={cn(
          "absolute z-40",
          "w-5 h-10",
          "bg-white border border-slate-200 border-l-0",
          "rounded-r-full",
          "flex items-center justify-center",
          "transition-all duration-300 ease-in-out",
          "shadow-sm hover:shadow-md",
          "group",
          "cursor-pointer"
        )}
        style={{
          top: '32px', // Center of header (h-16 = 64px, center = 32px)
          left: isCollapsed ? '74px' : '266px', // Edge position + half button width (w-5 = 20px, half = 10px)
          transform: 'translateY(-50%) translateX(calc(-50% - 3px))', // Center vertically, position slightly hidden behind edge
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) translateX(-50%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) translateX(calc(-50% - 3px))';
        }}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-accent transition-colors" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-accent transition-colors" />
        )}
      </button>
    </div>
  );

  // Mobile drawer
  const mobileDrawer = (
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center px-4 border-b border-slate-200">
            <Image
              src="/copilot-logo.svg"
              alt="CoPilot LMS"
              width={38}
              height={38}
              className="h-9 w-9"
              priority
            />
          </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {navigationItems.map((item, index) => (
              <li key={`${item.href}-${item.label}-${index}`}>
                {item.children && item.children.length > 0 ? (
                  <NavItemGroup
                    label={item.label}
                    icon={item.icon}
                    items={item.children}
                    isCollapsed={false}
                  />
                ) : (
                  <NavItem
                    {...item}
                    isActive={item.exactMatch ? pathname === item.href : pathname.startsWith(item.href)}
                    isCollapsed={false}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {/* Mobile menu button */}
      <MobileMenuButton isOpen={isMobileOpen} onToggle={toggleMobile} />

      {/* Desktop sidebar */}
      {desktopSidebar}

      {/* Mobile drawer */}
      {mobileDrawer}

      {/* Spacer for desktop sidebar */}
      <div className={cn('hidden md:block', isCollapsed ? 'w-16' : 'w-64')} />
    </>
  );
}

