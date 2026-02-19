import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  MapPin,
  Clock,
  Hash,
  Briefcase,
  Cake,
  Pencil,
  X,
  Plus,
  Check,
  Camera,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { STRENGTH_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@shared/schema";
import { cn } from "@/lib/utils";

function getTimezoneLabel(value: string) {
  const tz = TIMEZONE_OPTIONS.find((t) => t.value === value);
  return tz ? tz.label : value;
}

const profileFormSchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  slackHandle: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format").or(z.literal("")).optional(),
  whatIDo: z.string().max(500).optional(),
  workingPreferences: z.string().max(500).optional(),
  currentlyWorkingOn: z.string().max(200).optional(),
  strengths: z.array(z.string()).optional(),
  funFacts: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfileCompletion({ employee }: { employee: Employee }) {
  const fields = [
    employee.title,
    employee.location,
    employee.timezone,
    employee.whatIDo,
    employee.workingPreferences,
    employee.strengths && employee.strengths.length > 0,
    employee.funFacts && employee.funFacts.length > 0,
    employee.profileImageUrl,
  ];
  const filled = fields.filter(Boolean).length;
  const total = fields.length;
  const percent = Math.round((filled / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Profile completion</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newFunFact, setNewFunFact] = useState("");

  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      title: employee?.title || "",
      location: employee?.location || "",
      timezone: employee?.timezone || "",
      slackHandle: employee?.slackHandle || "",
      dateOfBirth: employee?.dateOfBirth || "",
      whatIDo: employee?.whatIDo || "",
      workingPreferences: employee?.workingPreferences || "",
      currentlyWorkingOn: employee?.currentlyWorkingOn || "",
      strengths: employee?.strengths || [],
      funFacts: employee?.funFacts || [],
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      return apiRequest("PATCH", "/api/profile", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Profile updated successfully" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const selectedStrengths = form.watch("strengths") || [];
  const funFacts = form.watch("funFacts") || [];

  const toggleStrength = (strength: string) => {
    const current = form.getValues("strengths") || [];
    if (current.includes(strength)) {
      form.setValue("strengths", current.filter(s => s !== strength));
    } else if (current.length < 5) {
      form.setValue("strengths", [...current, strength]);
    }
  };

  const addFunFact = () => {
    if (newFunFact.trim()) {
      const current = form.getValues("funFacts") || [];
      form.setValue("funFacts", [...current, newFunFact.trim()]);
      setNewFunFact("");
    }
  };

  const removeFunFact = (index: number) => {
    const current = form.getValues("funFacts") || [];
    form.setValue("funFacts", current.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader title="My Profile" />
        <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase();

  if (!isEditing) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader
          title="My Profile"
          description="How your teammates see you"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-profile"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit Profile
            </Button>
          }
        />

        <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-24 w-24 shrink-0">
                  <AvatarImage src={employee.profileImageUrl || undefined} alt={`${employee.firstName} ${employee.lastName}`} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h2 className="text-xl font-semibold" data-testid="text-profile-name">
                      {employee.firstName} {employee.lastName}
                    </h2>
                    {employee.title && (
                      <p className="text-muted-foreground" data-testid="text-profile-title">{employee.title}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    {employee.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {employee.location}
                      </span>
                    )}
                    {employee.timezone && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {getTimezoneLabel(employee.timezone)}
                      </span>
                    )}
                    {employee.slackHandle && (
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" />
                        {employee.slackHandle}
                      </span>
                    )}
                    {employee.dateOfBirth && isValid(parseISO(employee.dateOfBirth)) && (
                      <span className="flex items-center gap-1.5">
                        <Cake className="h-3.5 w-3.5" />
                        {format(parseISO(employee.dateOfBirth), "MMMM d")}
                      </span>
                    )}
                  </div>
                  <ProfileCompletion employee={employee} />
                </div>
              </div>
            </CardContent>
          </Card>

          {employee.whatIDo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  What I Do
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-what-i-do">{employee.whatIDo}</p>
              </CardContent>
            </Card>
          )}

          {employee.currentlyWorkingOn && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Currently Working On</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-currently-working-on">{employee.currentlyWorkingOn}</p>
              </CardContent>
            </Card>
          )}

          {employee.workingPreferences && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Working Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-working-preferences">{employee.workingPreferences}</p>
              </CardContent>
            </Card>
          )}

          {employee.strengths && employee.strengths.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="profile-strengths">
                  {employee.strengths.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {employee.funFacts && employee.funFacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fun Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2" data-testid="profile-fun-facts">
                  {employee.funFacts.map((fact, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5">&#x2022;</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader
        title="Edit Profile"
        description="Update your information"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              form.reset();
              setIsEditing(false);
            }}
            data-testid="button-cancel-edit"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => updateProfileMutation.mutate(values))}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Senior Engineer" {...field} data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., San Francisco, CA" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => {
                      const isLegacy = field.value && !TIMEZONE_OPTIONS.some(t => t.value === field.value);
                      return (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-timezone">
                                <SelectValue placeholder="Select your timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLegacy && (
                                <SelectItem value={field.value!}>
                                  {field.value} (current)
                                </SelectItem>
                              )}
                              {TIMEZONE_OPTIONS.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="slackHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slack Handle</FormLabel>
                        <FormControl>
                          <Input placeholder="@username" {...field} data-testid="input-slack" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date-of-birth" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">About You</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="whatIDo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What I Do</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your role and responsibilities..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="input-what-i-do"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentlyWorkingOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currently Working On</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What's your current focus?"
                          {...field}
                          data-testid="input-currently-working-on"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workingPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Preferences</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., I prefer async communication and focus hours in the morning..."
                          className="resize-none"
                          rows={2}
                          {...field}
                          data-testid="input-working-preferences"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strengths (max 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {STRENGTH_OPTIONS.map((strength) => (
                    <Badge
                      key={strength}
                      variant={selectedStrengths.includes(strength) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedStrengths.length >= 5 && !selectedStrengths.includes(strength) && "opacity-50"
                      )}
                      onClick={() => toggleStrength(strength)}
                      data-testid={`strength-${strength.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {selectedStrengths.includes(strength) && <Check className="h-3 w-3 mr-1" />}
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fun Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {funFacts.map((fact, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-muted rounded-md px-3 py-2">{fact}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFunFact(i)}
                      data-testid={`button-remove-fun-fact-${i}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a fun fact about yourself..."
                    value={newFunFact}
                    onChange={(e) => setNewFunFact(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFunFact();
                      }
                    }}
                    data-testid="input-new-fun-fact"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addFunFact}
                    disabled={!newFunFact.trim()}
                    data-testid="button-add-fun-fact"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
