import { Switch, Route, useLocation } from "wouter";
import copilotLogo from "@assets/copilot_logo_small_1770328812971.png";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Directory from "@/pages/directory";
import EmployeeProfile from "@/pages/employee-profile";
import Goals from "@/pages/goals";
import Snaps from "@/pages/snaps";
import FeedbackPage from "@/pages/feedback";
import Profile from "@/pages/profile";
import ActivityFeed from "@/pages/activity";
import Career from "@/pages/career";
import Settings from "@/pages/settings";
import type { Employee } from "@shared/schema";
import { AICoach } from "@/components/ai-coach";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { data: currentEmployee } = useQuery<Employee>({
    queryKey: ["/api/profile"],
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <div className="hidden lg:block">
          <AppSidebar currentEmployee={currentEmployee} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          {children}
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}

function getPageFromPath(path: string): string {
  if (path === "/") return "home";
  const segment = path.split("/")[1];
  return segment || "home";
}

function AuthenticatedRouter() {
  const [location] = useLocation();
  const currentPage = getPageFromPath(location);

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/directory" component={Directory} />
        <Route path="/directory/:id" component={EmployeeProfile} />
        <Route path="/goals" component={Goals} />
        <Route path="/snaps" component={Snaps} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/activity" component={ActivityFeed} />
        <Route path="/career" component={Career} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
      <AICoach currentPage={currentPage} />
    </AuthenticatedLayout>
  );
}

// Demo mode - set to true to bypass authentication for demos
const DEMO_MODE = true;

function Router() {
  const { user, isLoading } = useAuth();

  // In demo mode, skip auth check and go straight to app
  if (DEMO_MODE) {
    return <AuthenticatedRouter />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={copilotLogo} alt="Copilot" className="h-12 w-12 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="copilot-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
