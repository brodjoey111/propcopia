import { LayoutDashboard, Wallet, History, Settings, Activity, Plug, LogOut, User, Users, Calendar, TrendingUp, Star } from "lucide-react";
import { KillSwitchButton } from "@/components/kill-switch";
import { Link, useLocation } from "wouter";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Wallet,
  },
  {
    title: "Trading Calendar",
    url: "/trades",
    icon: History,
  },
  {
    title: "Live Activity",
    url: "/activity",
    icon: Activity,
  },
  {
    title: "Social",
    url: "/social",
    icon: Users,
  },
  {
    title: "Economic Calendar",
    url: "/economic-calendar",
    icon: Calendar,
  },
  {
    title: "Market Movers",
    url: "/market-movers",
    icon: TrendingUp,
  },
  {
    title: "Watchlist",
    url: "/watchlist",
    icon: Star,
  },
  {
    title: "Test Connection",
    url: "/test-connection",
    icon: Plug,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Logo size="sm" showText={true} variant="sidebar" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase().replace(/ /g, '-')}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="space-y-3 p-4">
        <KillSwitchButton />
        <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-white/[0.03] p-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profilePicture || undefined} alt={user?.username} />
            <AvatarFallback>
              {user?.username?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium" data-testid="text-username">
              {user?.username || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.bio || "Trader"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 bg-white/[0.02]"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
