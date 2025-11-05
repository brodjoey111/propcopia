import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CandlestickBackground } from "@/components/candlestick-background";
import { UserProvider } from "@/contexts/user-context";
import { ProtectedRoute } from "@/components/protected-route";
import { HelpChat } from "@/components/help-chat";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Trades from "@/pages/trades";
import Activity from "@/pages/activity";
import Social from "@/pages/social";
import EconomicCalendar from "@/pages/economic-calendar";
import MarketMovers from "@/pages/market-movers";
import Watchlist from "@/pages/watchlist";
import Settings from "@/pages/settings";
import TestConnection from "@/pages/test-connection";
import Pricing from "@/pages/pricing";

function AppRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/trades" component={Trades} />
      <Route path="/activity" component={Activity} />
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
            <header className="flex items-center justify-between border-b p-3 md:p-4 flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="h-11 w-11 touch-manipulation" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 min-w-0">
              <div className="mx-auto max-w-7xl">
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
          <Toaster />
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
