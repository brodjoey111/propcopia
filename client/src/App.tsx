import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationCenter } from "@/components/notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import { CandlestickBackground } from "@/components/candlestick-background";
import { UserProvider } from "@/contexts/user-context";
import { ProtectedRoute } from "@/components/protected-route";
import { HelpChat } from "@/components/help-chat";
import { LeaderboardTicker } from "@/components/leaderboard-ticker";
import { KillSwitchBanner } from "@/components/kill-switch";
import { TopNotificationBanner } from "@/components/top-notification-banner";
const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Auth = lazy(() => import("@/pages/auth"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Accounts = lazy(() => import("@/pages/accounts"));
const Trades = lazy(() => import("@/pages/trades"));
const Activity = lazy(() => import("@/pages/activity"));
const Notifications = lazy(() => import("@/pages/notifications"));
const Social = lazy(() => import("@/pages/social"));
const EconomicCalendar = lazy(() => import("@/pages/economic-calendar"));
const MarketMovers = lazy(() => import("@/pages/market-movers"));
const Watchlist = lazy(() => import("@/pages/watchlist"));
const Settings = lazy(() => import("@/pages/settings"));
const TestConnection = lazy(() => import("@/pages/test-connection"));
const Pricing = lazy(() => import("@/pages/pricing"));

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center px-6" role="status" aria-live="polite">
      <div className="rounded-2xl border border-white/8 bg-[rgba(8,16,32,0.82)] px-6 py-5 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <p className="mt-3 text-sm font-medium text-zinc-200">Opening workspace...</p>
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/trades" component={Trades} />
      <Route path="/activity" component={Activity} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/social" component={Social} />
      <Route path="/economic-calendar" component={EconomicCalendar} />
      <Route path="/market-movers" component={MarketMovers} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/settings" component={Settings} />
      <Route path="/test-connection" component={TestConnection} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ProtectedRoute>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[rgba(5,10,20,0.72)] px-3 py-3 backdrop-blur-xl md:px-5 md:py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="h-11 w-11 touch-manipulation" />
                <div className="hidden md:block">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Trading workspace</p>
                  <p className="text-sm font-semibold text-white">PropCopia Control Center</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationCenter />
                <ThemeToggle />
              </div>
            </header>
            <KillSwitchBanner />
            <TopNotificationBanner />
            <LeaderboardTicker />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 min-w-0">
              <div className="mx-auto max-w-[1440px]">
                <AppRouter />
              </div>
            </main>
          </div>
        </div>
        <HelpChat />
      </SidebarProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  const [location] = useLocation();
  const isPublicPage = location === "/" || location === "/auth" || location === "/pricing";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <Suspense fallback={<PageLoadingFallback />}>
            {isPublicPage && <CandlestickBackground />}
            {location === "/" ? (
              <Landing />
            ) : location === "/auth" ? (
              <Auth />
            ) : location === "/pricing" ? (
              <Pricing />
            ) : (
              <>
                <CandlestickBackground />
                <AppLayout />
              </>
            )}
          </Suspense>
          <Toaster />
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
