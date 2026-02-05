import { useLocation, Link } from "wouter";
import copilotLogo from "@assets/copilot_logo_small_1770328812971.png";
import { 
  Users, 
  Target, 
  Sparkles, 
  MessageSquare, 
  Settings,
  LogOut,
  ChevronRight,
  Activity,
  UserCircle,
  TrendingUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import type { Employee } from "@shared/schema";

const navItems = [
  { title: "Directory", url: "/directory", icon: Users },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Snaps", url: "/snaps", icon: Sparkles },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Activity", url: "/activity", icon: Activity },
  { title: "Career", url: "/career", icon: TrendingUp },
];

interface AppSidebarProps {
  currentEmployee?: Employee | null;
}

export function AppSidebar({ currentEmployee }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (currentEmployee) {
      return `${currentEmployee.firstName?.[0] || ""}${currentEmployee.lastName?.[0] || ""}`.toUpperCase();
    }
    if (user) {
      return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    }
    return "U";
  };

  const getDisplayName = () => {
    if (currentEmployee) {
      return `${currentEmployee.firstName} ${currentEmployee.lastName}`;
    }
    if (user) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    }
    return "User";
  };

  const getProfileImage = () => {
    return currentEmployee?.profileImageUrl || user?.profileImageUrl || undefined;
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <img src={copilotLogo} alt="Copilot" className="h-9 w-9" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Copilot</span>
            <span className="text-xs text-muted-foreground">Innovations</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarSeparator />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className="h-11"
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                        {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-3">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={getProfileImage()} alt={getDisplayName()} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground truncate">
              {currentEmployee?.title || "Team Member"}
            </p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="nav-profile">
              <Link href="/profile">
                <UserCircle className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="nav-settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
