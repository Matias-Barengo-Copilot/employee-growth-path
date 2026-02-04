import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Bell, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { STRENGTH_OPTIONS } from "@/lib/constants";
import type { Employee } from "@shared/schema";
import { cn } from "@/lib/utils";

const profileFormSchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  slackHandle: z.string().optional(),
  whatIDo: z.string().max(500).optional(),
  workingPreferences: z.string().max(500).optional(),
  currentlyWorkingOn: z.string().max(200).optional(),
  strengths: z.array(z.string()).optional(),
  funFacts: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      title: employee?.title || "",
      location: employee?.location || "",
      timezone: employee?.timezone || "",
      slackHandle: employee?.slackHandle || "",
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
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const selectedStrengths = form.watch("strengths") || [];

  const toggleStrength = (strength: string) => {
    const current = form.getValues("strengths") || [];
    if (current.includes(strength)) {
      form.setValue("strengths", current.filter(s => s !== strength));
    } else if (current.length < 5) {
      form.setValue("strengths", [...current, strength]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20 lg:pb-0">
        <PageHeader title="Settings" />
        <div className="p-4 lg:p-6 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Settings" 
        description="Manage your profile and preferences"
      />
      
      <div className="p-4 lg:p-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Help your teammates get to know you better
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit((values) => updateProfileMutation.mutate(values))} 
                className="space-y-6"
              >
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., PST" {...field} data-testid="input-timezone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
                  name="workingPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Preferences</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., I prefer async communication and have focus hours in the morning..."
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
                
                <div className="space-y-3">
                  <FormLabel>Strengths / Superpowers (max 5)</FormLabel>
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
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the app looks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Dark Mode</FormLabel>
                <FormDescription className="text-xs">
                  Switch between light and dark themes
                </FormDescription>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Snap Notifications</FormLabel>
                <FormDescription className="text-xs">
                  Get notified when you receive recognition
                </FormDescription>
              </div>
              <Switch defaultChecked data-testid="switch-snap-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Feedback Requests</FormLabel>
                <FormDescription className="text-xs">
                  Get notified when someone requests your feedback
                </FormDescription>
              </div>
              <Switch defaultChecked data-testid="switch-feedback-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Goal Reminders</FormLabel>
                <FormDescription className="text-xs">
                  Weekly reminders to update your goals
                </FormDescription>
              </div>
              <Switch defaultChecked data-testid="switch-goal-notifications" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
