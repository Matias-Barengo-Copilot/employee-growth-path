'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, MapPin, Calendar, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { EmployeeListItem } from '@/lib/types/employee';
import { getLeaveDaysAvailedSummary } from '@/lib/api/leave-requests';
import { formatLocalDate } from '@/lib/utils/date';

interface EmployeeCardProps {
  employee: EmployeeListItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  hr: 'HR',
};

const roleVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  employee: 'outline',
  supervisor: 'secondary',
  hr: 'default',
};

const roleTypeLabels: Record<string, string> = {
  employee: 'Employee',
  individual_contractor: 'Individual Contractor',
};

export function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
  const [leaveDaysAvailed, setLeaveDaysAvailed] = useState<{ vacation: number; personal: number } | null>(null);

  useEffect(() => {
    const loadLeaveDaysAvailed = async () => {
      try {
        const response = await getLeaveDaysAvailedSummary(employee.id);
        if (response.success) {
          setLeaveDaysAvailed(response.data);
        }
      } catch (error) {
        // Silently fail - not critical if we can't load leave days
        console.error('Failed to load leave days availed:', error);
      }
    };

    loadLeaveDaysAvailed();
  }, [employee.id]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="px-6 flex flex-col h-full">
        <div className="flex-1 space-y-4">
          {/* Header: Avatar, Name, and Badge */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg wrap-break-words">{employee.name}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant={roleVariants[employee.role] || 'outline'}>
                  {roleLabels[employee.role] || employee.role}
                </Badge>
                {'roleType' in employee && employee.roleType && (
                  <Badge variant="outline" className="text-xs">
                    {roleTypeLabels[employee.roleType] || employee.roleType}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{employee.email}</span>
            </div>
            {'country' in employee && employee.country && (
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{employee.country}</span>
              </div>
            )}
            {'joiningDate' in employee && employee.joiningDate && (
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="truncate">Joined: {formatLocalDate(employee.joiningDate)}</span>
              </div>
            )}
            {leaveDaysAvailed !== null && (leaveDaysAvailed.vacation > 0 || leaveDaysAvailed.personal > 0) && (
              <div className="flex flex-col gap-1">
                {leaveDaysAvailed.vacation > 0 && (
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {leaveDaysAvailed.vacation} {leaveDaysAvailed.vacation === 1 ? 'vacation leave' : 'vacation leaves'} availed
                    </span>
                  </div>
                )}
                {leaveDaysAvailed.personal > 0 && (
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {leaveDaysAvailed.personal} {leaveDaysAvailed.personal === 1 ? 'personal leave' : 'personal leaves'} availed
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Bottom of the card, full width */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => onEdit(employee.id)} className="flex-1">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            size="sm" 
            onClick={() => onDelete(employee.id)} 
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deactivate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
