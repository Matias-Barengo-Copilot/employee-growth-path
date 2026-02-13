'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, User, Settings, LogOut } from 'lucide-react';

interface HeaderProps {
  /** User's full name */
  userName: string;
  /** User's email address */
  userEmail: string;
}

/**
 * Dashboard header component
 * Displays user info and provides dropdown menu with actions
 * 
 * Features:
 * - User avatar (from Clerk)
 * - User name and role display
 * - Dropdown menu with Profile, Settings, and Logout
 * - Notifications icon (placeholder for future)
 * - Mobile-responsive design
 * 
 * @example
 * ```tsx
 * <Header
 *   userName="John Doe"
 *   userEmail="john@example.com"
 * />
 * ```
 */
export function Header({ userName, userEmail }: HeaderProps) {
  /**
   * Get user initials from name for avatar fallback
   * @param name - Full name of the user
   * @returns First letter of each word, uppercase, max 2 characters
   */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/sign-in' });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm">
      {/* Mobile menu button space - handled by Sidebar component */}
      <div className="md:hidden" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications (placeholder) */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        disabled
      >
        <Bell className="h-5 w-5" />
        {/* Badge can be added here in future */}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-accent/10 hover:text-accent transition-colors duration-200">
            <Avatar className="h-8 w-8">
              <AvatarImage src={undefined} alt={userName} />
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start text-left text-sm md:flex">
              <span className="font-medium">{userName}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-slate-500">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

