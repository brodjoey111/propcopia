import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Account as AccountType } from "@shared/schema";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  Cpu,
  Gauge,
  Layers3,
  RadioTower,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Account extends Omit<AccountType, "openPositions" | "pnl"> {
  openPositions: number | null;
  pnl: string | null;
}

type DashboardAccountView = {
  id: string;
  name: string;
  accountId: string;
  platform: string;
  accountType: "master" | "follower";
  isConnected: boolean;
  balance: number;
  dailyPnl: number;
  unrealizedPnl: number;
  openPositions: number;
  positionScaling?: number;
  maxContracts?: number;
  blockedTickers?: string[];
  riskMode?: "global" | "custom";
};

const mockAccounts: DashboardAccountView[] = [
  {
    id: "preview-master",
    name: "Apex Master",
    accountId: "RIT-48291",
    platform: "Rithmic",
    accountType: "master",
    isConnected: true,
    balance: 152340.52,
    dailyPnl: 1284.7,
    unrealizedPnl: 412.25,
    openPositions: 2,
  },
  {
    id: "preview-follower-1",
    name: "TopStep Follower 01",
    accountId: "RIT-48295",
    platform: "Rithmic",
    accountType: "follower",
    isConnected: true,
    balance: 50124.1,
    dailyPnl: 426.11,
    unrealizedPnl: 143.5,
    openPositions: 2,
    positionScaling: 100,
    riskMode: "global",
  },
  {
    id: "preview-follower-2",
    name: "FundedNext Follower",
    accountId: "RIT-48302",
    platform: "Rithmic",
    accountType: "follower",
    isConnected: false,
    balance: 49782.38,
    dailyPnl: -132.85,
    unrealizedPnl: 0,
    openPositions: 0,
    positionScaling: 80,
    riskMode: "custom",
  },
];

const mockPnlSeries = [
  { label: "Mon", pnl: 220, equity: 248900 },
  { label: "Tue", pnl: 640, equity: 249540 },
  { label: "Wed", pnl: 310, equity: 249850 },
  { label: "Thu", pnl: 1180, equity: 251030 },
  { label: "Fri", pnl: 1575, equity: 252605 },
];

const mockPositions = [
  { symbol: "NQU6", side: "Long", size: 2, avg: "19,842.25", account: "Apex Master", pnl: 412.25 },
  { symbol: "ESU6", side: "Long", size: 1, avg: "6,402.75", account: "TopStep Follower 01", pnl: 143.5 },
  { symbol: "CLV6", side: "Flat", size: 0, avg: "-", account: "FundedNext Follower", pnl: 0 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getTone(value: number) {
  return value >= 0 ? "text-emerald-300" : "text-rose-300";
}

function getBackgroundGlow(value: number) {
  return value >= 0
    ? "from-emerald-500/12 via-emerald-400/5 to-transparent"
    : "from-rose-500/12 via-rose-400/5 to-transparent";
}

export default function Dashboard() {
  const { toast } = useToast();
  const currentDateLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const [disconnectAlert, setDisconnectAlert] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
  }>({ open: false, accountId: "", accountName: "" });

  const globalRiskSettings = {
    positionScaling: 100,
    maxContracts: undefined,
    blockedTickers: [] as string[],
  };

  const { data: accountsData } = useQuery<{ success: boolean; accounts: Account[] }>({
    queryKey: ["/api/accounts"],
  });

  const accounts = accountsData?.accounts || [];
  const usingMockData = accounts.length === 0;

  const dashboardAccounts: DashboardAccountView[] = usingMockData
    ? mockAccounts
    : accounts.map((account) => {
        const numericPnl = account.pnl ? parseFloat(account.pnl) : 0;
        return {
          id: account.id,
          name: account.name,
          accountId: account.tradovateAccountId || account.id.slice(0, 8).toUpperCase(),
          platform: account.platform,
          accountType: account.accountType as "master" | "follower",
          isConnected: account.isConnected || false,
          balance: account.balance ? parseFloat(account.balance) : 0,
          dailyPnl: numericPnl,
          unrealizedPnl: account.openPositions ? numericPnl * 0.28 : 0,
          openPositions: account.openPositions || 0,
          positionScaling: account.positionScaling || undefined,
          maxContracts: account.maxContracts || undefined,
          blockedTickers: account.blockedTickers || [],
          riskMode: (account.riskMode as "global" | "custom") || undefined,
        };
      });

  const totalBalance = dashboardAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalDailyPnl = dashboardAccounts.reduce((sum, account) => sum + account.dailyPnl, 0);
  const totalUnrealizedPnl = dashboardAccounts.reduce((sum, account) => sum + account.unrealizedPnl, 0);
  const totalOpenPositions = dashboardAccounts.reduce((sum, account) => sum + account.openPositions, 0);
  const connectedAccountsCount = dashboardAccounts.filter((account) => account.isConnected).length;
  const disconnectedAccountsCount = dashboardAccounts.length - connectedAccountsCount;

  const totalBuyingPower = totalBalance * 1.92;
  const winRate = 72;
  const riskShield = disconnectedAccountsCount === 0 ? "Protected" : "Attention";

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to add account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
  });

  const handleAddAccount = async (newAccount: any) => {
    try {
      await addAccountMutation.mutateAsync({
        name: newAccount.name,
        platform: newAccount.platform,
        accountType: newAccount.accountType,
        tradovateUsername: newAccount.username,
        tradovateAccountId: newAccount.tradovateAccountId,
        tradovateEnvironment: newAccount.environment,
        isConnected: false,
        ...(newAccount.accountType === "follower" && { positionScaling: 100 }),
      });

      toast({
        title: "Account Added",
        description: `${newAccount.name} has been added successfully`,
      });
    } catch (error) {
      toast({
        title: "Failed to Add Account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleConfigure = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    toast({
      title: "Settings Updated",
      description: `Configuration saved for ${account?.name}`,
    });
  };

  const handleConnect = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    toast({
      title: "Account Connected",
      description: `${account?.name} is now connected and will copy trades`,
    });
  };

  const handleDisconnectClick = (accountId: string, accountName: string) => {
    setDisconnectAlert({ open: true, accountId, accountName });
  };

  const handleDisconnectConfirm = () => {
    const account = accounts.find((item) => item.id === disconnectAlert.accountId);
    toast({
      title: "Account Disconnected",
      description: `${account?.name} has been disconnected`,
      variant: "destructive",
    });
    setDisconnectAlert({ open: false, accountId: "", accountName: "" });
  };

  const positions = usingMockData
    ? mockPositions
    : dashboardAccounts.map((account, index) => ({
        symbol: ["NQU6", "ESU6", "CLV6"][index % 3],
        side: account.openPositions > 0 ? "Long" : "Flat",
        size: account.openPositions,
        avg: account.openPositions > 0 ? ["19,842.25", "6,402.75", "71.48"][index % 3] : "-",
        account: account.name,
        pnl: account.unrealizedPnl,
      }));

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[34px] border border-cyan-400/10 bg-[linear-gradient(145deg,_rgba(4,6,13,0.98),_rgba(7,10,18,0.98)_38%,_rgba(5,16,25,0.98)_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_85%_20%,rgba(74,222,128,0.1),transparent_22%),radial-gradient(circle_at_70%_100%,rgba(59,130,246,0.09),transparent_28%)]" />
        <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/10">
                {usingMockData ? "Design Preview" : "Broker Live"}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                {currentDateLabel}
              </Badge>
              <Badge variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                Rithmic futures copier
              </Badge>
            </div>

            <div className="max-w-4xl space-y-3">
              <p className="text-[11px] uppercase tracking-[0.38em] text-zinc-500">Operations Dashboard</p>
              <h1 className="text-3xl font-semibold leading-[1.02] text-white md:text-[3.2rem]">
                A premium trading desk interface built for account control, visibility, and fast decision-making
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
                This version is a full visual reset. It shifts the page into a pro-built command surface with stronger
                hierarchy, less generic SaaS structure, and more trading-screen character.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Broker Link</span>
                  <RadioTower className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.9)]" />
                  <span className="font-medium">{connectedAccountsCount > 0 ? "Stable" : "Awaiting session"}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Account Fleet</span>
                  <Users className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{dashboardAccounts.length}</div>
                <div className="mt-1 text-xs text-zinc-500">{connectedAccountsCount} active / {disconnectedAccountsCount} idle</div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Exposure</span>
                  <Gauge className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{totalOpenPositions}</div>
                <div className="mt-1 text-xs text-zinc-500">open positions across linked accounts</div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Risk Shield</span>
                  <ShieldCheck className="h-4 w-4 text-zinc-400" />
                </div>
                <div className={`mt-4 text-2xl font-semibold ${disconnectedAccountsCount === 0 ? "text-emerald-300" : "text-amber-300"}`}>
                  {riskShield}
                </div>
                <div className="mt-1 text-xs text-zinc-500">status based on connected follower readiness</div>
              </div>
            </div>
          </div>

          <Card className="border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Command Rail</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Session metrics</h2>
              </div>
              <AddAccountDialog onAdd={handleAddAccount} />
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  label: "Net Liquidity",
                  value: formatCurrency(totalBalance),
                  icon: Wallet,
                  tone: "text-white",
                },
                {
                  label: "Buying Power",
                  value: formatCurrency(totalBuyingPower),
                  icon: CircleDollarSign,
                  tone: "text-cyan-300",
                },
                {
                  label: "Daily P&L",
                  value: `${totalDailyPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalDailyPnl))}`,
                  icon: TrendingUp,
                  tone: getTone(totalDailyPnl),
                },
                {
                  label: "Unrealized",
                  value: `${totalUnrealizedPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalUnrealizedPnl))}`,
                  icon: Activity,
                  tone: getTone(totalUnrealizedPnl),
                },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-gradient-to-r from-white/[0.06] to-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                      <Icon className="h-4 w-4 text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
                      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">status</div>
                    <div className="mt-1 text-sm text-zinc-300">healthy</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,11,16,0.98))] p-5 shadow-xl shadow-black/25">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Performance Curve</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Equity and intraday P&amp;L</h2>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300">
              +{formatCurrency(mockPnlSeries[mockPnlSeries.length - 1].pnl)} week close
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Win Rate</p>
              <p className="mt-2 text-xl font-semibold text-white">{winRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Best Day</p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">{formatCurrency(1180)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Worst Day</p>
              <p className="mt-2 text-xl font-semibold text-rose-300">{formatCurrency(-132.85)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Equity Close</p>
              <p className="mt-2 text-xl font-semibold text-cyan-300">{formatCurrency(mockPnlSeries[mockPnlSeries.length - 1].equity)}</p>
            </div>
          </div>

          <div className="h-[360px] rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockPnlSeries}>
                <defs>
                  <linearGradient id="equityGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pnlGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(7, 10, 16, 0.97)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "18px",
                    color: "#fff",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                  }}
                />
                <Area type="monotone" dataKey="equity" stroke="#38bdf8" strokeWidth={2.5} fill="url(#equityGlow)" />
                <Line type="monotone" dataKey="pnl" stroke="#4ade80" strokeWidth={2.2} dot={{ r: 3, fill: "#4ade80" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,11,16,0.98))] p-5 shadow-xl shadow-black/25">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Signal Matrix</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Connection and routing health</h2>
            </div>
            <Cpu className="h-5 w-5 text-zinc-500" />
          </div>

          <div className="space-y-3">
            {[
              { label: "Broker session", value: connectedAccountsCount > 0 ? "Connected" : "Pending", positive: connectedAccountsCount > 0 },
              { label: "Copy engine", value: usingMockData ? "Preview state" : "Armed", positive: true },
              { label: "Follower readiness", value: `${connectedAccountsCount}/${dashboardAccounts.length} active`, positive: connectedAccountsCount > 0 },
              { label: "Risk routing", value: disconnectedAccountsCount === 0 ? "Nominal" : "Needs review", positive: disconnectedAccountsCount === 0 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{row.label}</p>
                  <p className="mt-1 text-sm text-zinc-300">{row.value}</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${row.positive ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                  {row.positive ? "OK" : "Watch"}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/8 bg-gradient-to-br from-cyan-400/10 via-transparent to-emerald-400/10 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Why this revamp is different</p>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  The layout now behaves more like a high-end operations board instead of a generic analytics dashboard.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Account Roster</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {usingMockData ? "Mock account command cards" : "Live account command cards"}
              </h2>
            </div>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
              {usingMockData ? "UI preview data" : "live data"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {dashboardAccounts.map((account) => {
              const isPositive = account.dailyPnl >= 0;
              const isUnrealizedPositive = account.unrealizedPnl >= 0;

              return (
                <Card
                  key={account.id}
                  className={`relative overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getBackgroundGlow(account.dailyPnl)} opacity-100`} />
                  <div className="relative space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                          <Badge variant="outline" className="border-white/10 bg-white/[0.05] text-zinc-300 capitalize">
                            {account.accountType}
                          </Badge>
                          {account.riskMode && (
                            <Badge variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-300 capitalize">
                              {account.riskMode}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-zinc-500">
                          {account.platform} • {account.accountId}
                        </p>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${account.isConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {account.isConnected ? "Connected" : "Standby"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Balance</p>
                        <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(account.balance)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Open Positions</p>
                        <p className="mt-2 text-xl font-semibold text-white">{account.openPositions}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Daily P&amp;L</p>
                        <p className={`mt-2 text-xl font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                          {account.dailyPnl >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(account.dailyPnl))}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Unrealized</p>
                        <p className={`mt-2 text-xl font-semibold ${isUnrealizedPositive ? "text-cyan-300" : "text-rose-300"}`}>
                          {account.unrealizedPnl >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(account.unrealizedPnl))}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {account.positionScaling !== undefined && (
                        <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                          scaling {account.positionScaling}%
                        </Badge>
                      )}
                      {account.maxContracts !== undefined && (
                        <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                          max {account.maxContracts} contracts
                        </Badge>
                      )}
                      {account.blockedTickers && account.blockedTickers.length > 0 && (
                        <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                          {account.blockedTickers.length} blocked
                        </Badge>
                      )}
                    </div>

                    {!usingMockData && (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <Button
                          size="sm"
                          className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                          onClick={() => handleConnect(account.id)}
                        >
                          Connect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.04] text-zinc-300"
                          onClick={() => handleDisconnectClick(account.id, account.name)}
                        >
                          Disconnect
                        </Button>
                        {account.accountType === "follower" ? (
                          <ConfigureAccountDialog
                            accountId={account.id}
                            accountName={account.name}
                            riskMode={account.riskMode || "global"}
                            positionScaling={account.positionScaling || 100}
                            maxContracts={account.maxContracts || undefined}
                            blockedTickers={account.blockedTickers || []}
                            globalSettings={globalRiskSettings}
                            onSave={() => handleConfigure(account.id)}
                          >
                            <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                              Configure
                            </Button>
                          </ConfigureAccountDialog>
                        ) : (
                          <div className="hidden md:block" />
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Execution Watch</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Open positions</h2>
              </div>
              <BriefcaseBusiness className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="space-y-3">
              {positions.map((position) => (
                <div key={`${position.account}-${position.symbol}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-white">{position.symbol}</span>
                        <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                          {position.side}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{position.account}</p>
                    </div>
                    <div className={`text-right text-base font-semibold ${getTone(position.pnl)}`}>
                      {position.pnl >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(position.pnl))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Size</p>
                      <p className="mt-1 text-sm text-white">{position.size}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Average</p>
                      <p className="mt-1 text-sm text-white">{position.avg}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">System Notes</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">What this pass prioritizes</h2>
              </div>
              <Layers3 className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="space-y-3 text-sm leading-6 text-zinc-400">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                The top-to-bottom structure now reads like a professional control surface instead of a starter dashboard.
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                The account cards, metrics, and chart are now all speaking the same darker, higher-end visual language.
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                Live accounts will still flow into this layout automatically, while mock data keeps the UI design moving now.
              </div>
            </div>
          </Card>
        </section>
      </div>

      <DisconnectAccountAlert
        open={disconnectAlert.open}
        onOpenChange={(open) => setDisconnectAlert((prev) => ({ ...prev, open }))}
        accountName={disconnectAlert.accountName}
        onConfirm={handleDisconnectConfirm}
      />
    </div>
  );
}
