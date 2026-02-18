'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, MapPin, Cake } from 'lucide-react';
import { EmployeeListItem } from '@/lib/types/employee';
import { formatLocalDate } from '@/lib/utils/date';

interface EmployeeCardProps {
  employee: EmployeeListItem;
}

const roleLabels: Record<string, string> = {
  employee: 'Member',
  supervisor: 'Supervisor',
  hr: 'HR',
};

const roleVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  employee: 'outline',
  supervisor: 'secondary',
  hr: 'default',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatBirthday(birthday: string | null): string | null {
  if (!birthday) return null;
  try {
    const date = new Date(birthday + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const initials = getInitials(employee.name);
  const birthdayDisplay = formatBirthday(employee.birthday);

  return (
    <Link href={`/employees/${employee.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 h-full" data-testid={`card-employee-${employee.id}`}>
        <CardContent className="p-5">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-3 ring-2 ring-background shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <h3 className="font-semibold text-base mb-0.5" data-testid={`text-employee-name-${employee.id}`}>
              {employee.name}
            </h3>

            <Badge variant={roleVariants[employee.role] || 'outline'} className="mb-3 text-xs">
              {roleLabels[employee.role] || employee.role}
            </Badge>

            <div className="flex flex-col items-center gap-1.5 text-muted-foreground w-full">
              {(employee.location || employee.country) && (
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{employee.location || employee.country}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[180px]">{employee.email}</span>
              </div>
              {birthdayDisplay && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Cake className="h-3 w-3 shrink-0" />
                  <span>{birthdayDisplay}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
