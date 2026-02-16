'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getEmployeeById, updateEmployee, type EmployeeDetail, type UpdateEmployeeInput } from '@/lib/api/employees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Clock,
  Hash,
  Pencil,
  X,
  Check,
  Briefcase,
  Lightbulb,
  Heart,
  Sparkles,
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

function computeProfileCompletion(emp: EmployeeDetail): number {
  const fields = [
    emp.title,
    emp.location,
    emp.timezone,
    emp.whatIDo,
    emp.workingPreferences,
    emp.currentlyWorkingOn,
    emp.strengths && emp.strengths.length > 0 ? 'filled' : null,
    emp.funFacts && emp.funFacts.length > 0 ? 'filled' : null,
    emp.slackHandle,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEmployeeInput>({});

  const employeeId = params.id as string;
  const isCurrentUser = session?.user?.employeeId === employeeId;
  const isHR = session?.user?.role === 'hr';
  const canEdit = isCurrentUser || isHR;

  const loadEmployee = useCallback(async () => {
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
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId, loadEmployee]);

  const startEditing = () => {
    if (!employee) return;
    setEditForm({
      title: employee.title || '',
      location: employee.location || '',
      timezone: employee.timezone || '',
      slackHandle: employee.slackHandle || '',
      whatIDo: employee.whatIDo || '',
      workingPreferences: employee.workingPreferences || '',
      currentlyWorkingOn: employee.currentlyWorkingOn || '',
      strengths: employee.strengths || [],
      funFacts: employee.funFacts || [],
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveProfile = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      await updateEmployee(employee.id, editForm);
      await loadEmployee();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const addArrayItem = (field: 'strengths' | 'funFacts', value: string) => {
    if (!value.trim()) return;
    const current = (editForm[field] as string[]) || [];
    setEditForm({ ...editForm, [field]: [...current, value.trim()] });
  };

  const removeArrayItem = (field: 'strengths' | 'funFacts', index: number) => {
    const current = (editForm[field] as string[]) || [];
    setEditForm({ ...editForm, [field]: current.filter((_, i) => i !== index) });
  };

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
  const profileCompletion = computeProfileCompletion(employee);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')} data-testid="button-back-directory">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Directory
        </Button>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile">
            <Pencil className="h-4 w-4 mr-1" />
            Edit Profile
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEditing} data-testid="button-cancel-edit">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={saveProfile} disabled={isSaving} data-testid="button-save-profile">
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
              {employee.profileImageUrl && (
                <AvatarImage src={employee.profileImageUrl} alt={employee.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-2xl font-bold" data-testid="text-profile-name">
                    {employee.name}
                  </h2>
                  <p className="text-muted-foreground text-sm" data-testid="text-profile-title">
                    {employee.title || 'Team Member'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
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

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  data-testid="link-email"
                >
                  <Mail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </a>
                {employee.location && (
                  <div className="flex items-center gap-1.5" data-testid="text-location">
                    <MapPin className="h-4 w-4" />
                    <span>{employee.location}</span>
                  </div>
                )}
                {!employee.location && employee.country && (
                  <div className="flex items-center gap-1.5" data-testid="text-country">
                    <MapPin className="h-4 w-4" />
                    <span>{employee.country}</span>
                  </div>
                )}
                {employee.timezone && (
                  <div className="flex items-center gap-1.5" data-testid="text-timezone">
                    <Clock className="h-4 w-4" />
                    <span>{employee.timezone}</span>
                  </div>
                )}
                {employee.slackHandle && (
                  <div className="flex items-center gap-1.5" data-testid="text-slack">
                    <Hash className="h-4 w-4" />
                    <span>@{employee.slackHandle}</span>
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

              {employee.whatIDo && !isEditing && (
                <p className="text-sm" data-testid="text-what-i-do">{employee.whatIDo}</p>
              )}
            </div>
          </div>

          {isCurrentUser && profileCompletion < 100 && !isEditing && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your profile to help your team get to know you better.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditing ? (
        <EditProfileForm
          editForm={editForm}
          setEditForm={setEditForm}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
        />
      ) : (
        <ProfileInfoCards employee={employee} />
      )}
    </div>
  );
}

function ProfileInfoCards({ employee }: { employee: EmployeeDetail }) {
  const hasInfo = employee.currentlyWorkingOn || employee.workingPreferences ||
    (employee.strengths && employee.strengths.length > 0) ||
    (employee.funFacts && employee.funFacts.length > 0);

  if (!hasInfo) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {employee.currentlyWorkingOn && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Currently Working On</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="text-currently-working-on">
              {employee.currentlyWorkingOn}
            </p>
          </CardContent>
        </Card>
      )}

      {employee.workingPreferences && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Working Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="text-working-preferences">
              {employee.workingPreferences}
            </p>
          </CardContent>
        </Card>
      )}

      {employee.strengths && employee.strengths.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" data-testid="list-strengths">
              {employee.strengths.map((strength) => (
                <Badge key={strength} variant="secondary">
                  {strength}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {employee.funFacts && employee.funFacts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Fun Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground" data-testid="list-fun-facts">
              {employee.funFacts.map((fact, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">&#x2022;</span>
                  {fact}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditProfileForm({
  editForm,
  setEditForm,
  addArrayItem,
  removeArrayItem,
}: {
  editForm: UpdateEmployeeInput;
  setEditForm: (form: UpdateEmployeeInput) => void;
  addArrayItem: (field: 'strengths' | 'funFacts', value: string) => void;
  removeArrayItem: (field: 'strengths' | 'funFacts', index: number) => void;
}) {
  const [newStrength, setNewStrength] = useState('');
  const [newFunFact, setNewFunFact] = useState('');

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title / Role</Label>
            <Input
              id="title"
              placeholder="e.g. Senior Product Designer"
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              data-testid="input-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. San Francisco, CA"
              value={editForm.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              data-testid="input-location"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              placeholder="e.g. PST (UTC-8)"
              value={editForm.timezone || ''}
              onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
              data-testid="input-timezone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slackHandle">Slack Handle</Label>
            <Input
              id="slackHandle"
              placeholder="e.g. jane.doe"
              value={editForm.slackHandle || ''}
              onChange={(e) => setEditForm({ ...editForm, slackHandle: e.target.value })}
              data-testid="input-slack"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatIDo">What I Do</Label>
            <Textarea
              id="whatIDo"
              placeholder="A brief description of your role and responsibilities..."
              value={editForm.whatIDo || ''}
              onChange={(e) => setEditForm({ ...editForm, whatIDo: e.target.value })}
              rows={3}
              data-testid="input-what-i-do"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentlyWorkingOn">Currently Working On</Label>
            <Input
              id="currentlyWorkingOn"
              placeholder="e.g. Q1 product launch, onboarding revamp"
              value={editForm.currentlyWorkingOn || ''}
              onChange={(e) => setEditForm({ ...editForm, currentlyWorkingOn: e.target.value })}
              data-testid="input-currently-working-on"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workingPreferences">Working Preferences</Label>
            <Textarea
              id="workingPreferences"
              placeholder="e.g. I prefer async communication, focused deep work in mornings..."
              value={editForm.workingPreferences || ''}
              onChange={(e) => setEditForm({ ...editForm, workingPreferences: e.target.value })}
              rows={3}
              data-testid="input-working-preferences"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strengths</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(editForm.strengths || []).map((strength, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {strength}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-0.5"
                  type="button"
                  onClick={() => removeArrayItem('strengths', i)}
                  data-testid={`button-remove-strength-${i}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a strength..."
              value={newStrength}
              onChange={(e) => setNewStrength(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('strengths', newStrength);
                  setNewStrength('');
                }
              }}
              data-testid="input-new-strength"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                addArrayItem('strengths', newStrength);
                setNewStrength('');
              }}
              data-testid="button-add-strength"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fun Facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {(editForm.funFacts || []).map((fact, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-primary mt-0.5">&#x2022;</span>
                <span className="flex-1">{fact}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  type="button"
                  onClick={() => removeArrayItem('funFacts', i)}
                  data-testid={`button-remove-funfact-${i}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="Add a fun fact..."
              value={newFunFact}
              onChange={(e) => setNewFunFact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('funFacts', newFunFact);
                  setNewFunFact('');
                }
              }}
              data-testid="input-new-funfact"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                addArrayItem('funFacts', newFunFact);
                setNewFunFact('');
              }}
              data-testid="button-add-funfact"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
