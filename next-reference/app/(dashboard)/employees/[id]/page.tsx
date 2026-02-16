'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getEmployeeById, type EmployeeDetail } from '@/lib/api/employees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Cake,
  Calendar,
  Zap,
  MessageSquare,
  Loader2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { formatLocalDate } from '@/lib/utils/date';

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

const roleTypeLabels: Record<string, string> = {
  employee: 'Member',
  individual_contractor: 'Individual Contractor',
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
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  } catch {
    return null;
  }
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeId = params.id as string;
  const isCurrentUser = session?.user?.employeeId === employeeId;

  useEffect(() => {
    const loadEmployee = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEmployeeById(employeeId);
        setEmployee(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} data-testid="button-back-directory">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Directory
        </Button>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} data-testid="button-back-directory">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Directory
        </Button>
        <Card>
          <CardContent className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Profile not found</h3>
            <p className="text-muted-foreground">
              {error || "This profile doesn't exist or you don't have access."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getInitials(employee.name);
  const birthdayDisplay = formatBirthday(employee.birthday);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} data-testid="button-back-directory">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Directory
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold" data-testid="text-profile-name">
                    {employee.name}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant={roleVariants[employee.role] || 'outline'}>
                      {roleLabels[employee.role] || employee.role}
                    </Badge>
                    {employee.roleType && employee.roleType !== 'employee' && (
                      <Badge variant="outline">
                        {roleTypeLabels[employee.roleType] || employee.roleType}
                      </Badge>
                    )}
                  </div>
                </div>

                {!isCurrentUser && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild data-testid="button-give-snap">
                      <Link href={`/snaps?recipient=${employee.id}`}>
                        <Zap className="h-4 w-4 mr-1" />
                        Give Snap
                      </Link>
                    </Button>
                    <Button size="sm" asChild data-testid="button-give-feedback">
                      <Link href={`/feedback?recipient=${employee.id}`}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Give Feedback
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  data-testid="link-email"
                >
                  <Mail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </a>
                {employee.country && (
                  <div className="flex items-center gap-1.5" data-testid="text-country">
                    <MapPin className="h-4 w-4" />
                    <span>{employee.country}</span>
                  </div>
                )}
                {birthdayDisplay && (
                  <div className="flex items-center gap-1.5" data-testid="text-birthday">
                    <Cake className="h-4 w-4" />
                    <span>{birthdayDisplay}</span>
                  </div>
                )}
                {employee.joiningDate && (
                  <div className="flex items-center gap-1.5" data-testid="text-joining-date">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatLocalDate(employee.joiningDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
