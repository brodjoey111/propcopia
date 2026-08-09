import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AccountCreatePayload } from "@/lib/account-create-payload";
import {
  buildCopyGroupActivityFeed,
  filterCopyGroupActivityFeed,
  hydrateCopyGroup,
  summarizeCopyGroups,
  type CopyGroup,
  type CopyGroupSnapshotApiResponse,
} from "@/lib/copy-groups";
import {
  buildAccountLiveMetricsById,
  toDashboardPositionRows,
  type PositionSnapshotResponse,
} from "@/lib/positions";
import {
  buildAccountBalanceMetricsById,
} from "@/lib/account-live-metrics";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
  SESSION_STATUS_POLL_MS,
} from "@/lib/live-query-config";
import type { OperationsOverviewResponse } from "@/lib/operations-overview";
import type { DashboardRuntimeOverviewResponse } from "@/lib/runtime-overview";
import type { TradeHistoryDailySummary } from "@/lib/trade-history";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import {
  connectAccount,
  disconnectAccount,
  updateAccountConnectionInQueryData,
} from "@/lib/account-connection-api";
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

interface AuthMeResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
  };
}

interface TradeCopyStatusResponse {
  success: boolean;
  data: {
    masterConnected: boolean;
    masterConnectionType: "tradovate" | "rithmic" | "none";
    followerCount: number;
    connectedFollowerCount: number;
    ready: boolean;
    followers: Array<{
      accountId: string;
      brokerKind: "tradovate" | "rithmic" | "legacy_websocket";
      connected: boolean;
    }>;
  };
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

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

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

function formatActivityTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
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
  const { data: authData } = useQuery<AuthMeResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: tradeCopyStatusData } = useQuery<TradeCopyStatusResponse | null>({
    queryKey: authData?.user?.id ? ["/api/trade-copy/status", authData.user.id] : ["/api/trade-copy/status", "anonymous"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (res.status === 401 || res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return res.json();
    },
    enabled: !!authData?.user?.id && !usingMockData,
    refetchInterval: SESSION_STATUS_POLL_MS,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: runtimeOverviewData } = useQuery<DashboardRuntimeOverviewResponse | null>({
    queryKey: authData?.user?.id ? ["/api/runtime/dashboard-overview", authData.user.id] : ["/api/runtime/dashboard-overview", "anonymous"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (res.status === 401 || res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return res.json();
    },
    enabled: !!authData?.user?.id && !usingMockData,
    refetchInterval: LIVE_QUERY_POLL_MS,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const copyGroupSnapshotData: CopyGroupSnapshotApiResponse | null = runtimeOverviewData?.copyGroups
    ? {
        success: true,
        generatedAt: runtimeOverviewData.generatedAt,
        groups: runtimeOverviewData.copyGroups.groups,
        runningGroups: runtimeOverviewData.copyGroups.runningGroups,
      }
    : null;
  const positionSnapshotData: PositionSnapshotResponse | null = runtimeOverviewData?.positionSnapshot ?? null;
  const operationsOverviewData: OperationsOverviewResponse | null = runtimeOverviewData?.operationsOverview ?? null;
  const accountBalanceMetricsById = buildAccountBalanceMetricsById(runtimeOverviewData?.accountLiveMetrics.accounts ?? []);
  const positionMetricsById = buildAccountLiveMetricsById(positionSnapshotData?.accounts ?? []);
  const tradeAnalytics = runtimeOverviewData?.tradeAnalytics;
  const hydratedCopyGroups = copyGroupSnapshotData?.groups.map((group) => hydrateCopyGroup(group)) ?? [];
  const copyGroupFeed = copyGroupSnapshotData
    ? buildCopyGroupActivityFeed(
        hydratedCopyGroups,
        Object.fromEntries(
          copyGroupSnapshotData.groups.map((group) => [group.group.group.groupId, group.activity]),
        ),
      )
    : [];

  const dashboardAccounts: DashboardAccountView[] = usingMockData
    ? mockAccounts
    : accounts.map((account) => {
        const numericPnl = account.pnl ? parseFloat(account.pnl) : 0;
        const liveBalanceMetrics = accountBalanceMetricsById[account.id];
        const livePositionMetrics = positionMetricsById[account.id];
        return {
          id: account.id,
          name: account.name,
          accountId:
            account.tradovateAccountId ||
            account.rithmicAccountId ||
            account.tradeifyAccountId ||
            account.id.slice(0, 8).toUpperCase(),
          platform: account.platform,
          accountType: account.accountType as "master" | "follower",
          isConnected: account.isConnected || false,
          balance:
            liveBalanceMetrics?.hasLiveBrokerData
              ? (liveBalanceMetrics.balance ?? 0)
              : (account.balance ? parseFloat(account.balance) : 0),
          dailyPnl: numericPnl,
          unrealizedPnl:
            livePositionMetrics?.hasLiveBrokerData
              ? livePositionMetrics.unrealizedPnl
              : (account.openPositions ? numericPnl * 0.28 : 0),
          openPositions:
            livePositionMetrics?.hasLiveBrokerData
              ? livePositionMetrics.openPositions
              : (account.openPositions || 0),
          positionScaling: account.positionScaling || undefined,
          maxContracts: account.maxContracts || undefined,
          blockedTickers: account.blockedTickers || [],
          riskMode: (account.riskMode as "global" | "custom") || undefined,
        };
      });

  const totalBalance = dashboardAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalDailyPnl = dashboardAccounts.reduce((sum, account) => sum + account.dailyPnl, 0);
  const connectedAccountsCount = dashboardAccounts.filter((account) => account.isConnected).length;
  const disconnectedAccountsCount = dashboardAccounts.length - connectedAccountsCount;

  const totalBuyingPower = totalBalance * 1.92;
  const tradeHistorySummary = tradeAnalytics?.summary ?? {
    total: 0,
    filled: 0,
    failed: 0,
    pending: 0,
    skippedOrRejected: 0,
  };
  const dailyExecutionSeries: TradeHistoryDailySummary[] = tradeAnalytics?.dailyExecutionSeries ?? [];
  const filledRate = tradeHistorySummary.total > 0
    ? Math.round((tradeHistorySummary.filled / tradeHistorySummary.total) * 100)
    : 0;
  const bestExecutionDay = dailyExecutionSeries.reduce(
    (best, day) => (day.total > best.total ? day : best),
    dailyExecutionSeries[0] ?? { label: "N/A", dateKey: "", total: 0, filled: 0, pending: 0, failed: 0 },
  );
  const highestFilledDay = dailyExecutionSeries.reduce(
    (best, day) => (day.filled > best.filled ? day : best),
    dailyExecutionSeries[0] ?? { label: "N/A", dateKey: "", total: 0, filled: 0, pending: 0, failed: 0 },
  );
  const highestFailureDay = dailyExecutionSeries.reduce(
    (best, day) => (day.failed > best.failed ? day : best),
    dailyExecutionSeries[0] ?? { label: "N/A", dateKey: "", total: 0, filled: 0, pending: 0, failed: 0 },
  );
  const tradeCopyStatus = tradeCopyStatusData?.data;
  const derivedCopyGroupOverview = summarizeCopyGroups(hydratedCopyGroups);
  const copyGroupOverview = operationsOverviewData
    ? {
        ...derivedCopyGroupOverview,
        totalGroups: operationsOverviewData.copyGroups.totalGroups,
        runningGroups: operationsOverviewData.copyGroups.runningGroups,
        pausedGroups: operationsOverviewData.copyGroups.pausedGroups,
        degradedGroups: operationsOverviewData.copyGroups.degradedGroups,
        unhealthyGroups: operationsOverviewData.copyGroups.unhealthyGroups,
        connectedFollowers: operationsOverviewData.copyGroups.connectedFollowers,
        totalFollowers: operationsOverviewData.copyGroups.totalFollowers,
      }
    : derivedCopyGroupOverview;
  const copyGroupAlerts = operationsOverviewData
    ? operationsOverviewData.recentAlerts.slice(0, 8).map((activity) => ({
        id: activity.eventId,
        groupId: activity.groupId,
        groupName: activity.groupName,
        timestamp: activity.timestamp,
        message: activity.message,
        type: (
          activity.severity === "ERROR"
            ? "error"
            : activity.category === "HEALTH" || activity.category === "LIFECYCLE"
              ? "connection"
              : "trade"
        ) as "error" | "connection" | "trade" | "success",
        severity: activity.severity,
        category: activity.category,
      }))
    : filterCopyGroupActivityFeed(copyGroupFeed, "alerts").slice(0, 8);
  const totalUnrealizedPnl = positionSnapshotData?.accounts?.reduce(
    (sum, account) =>
      sum + account.positions.reduce((positionSum, position) => positionSum + (position.unrealizedPnl ?? 0), 0),
    0,
  ) ?? dashboardAccounts.reduce((sum, account) => sum + account.unrealizedPnl, 0);
  const totalOpenPositions = operationsOverviewData?.positions.totalOpenPositions
    ?? positionSnapshotData?.summary.totalOpenPositions
    ?? dashboardAccounts.reduce((sum, account) => sum + account.openPositions, 0);
  const copySessionLabel = usingMockData
    ? "Preview state"
    : tradeCopyStatus?.ready
      ? "Ready"
      : tradeCopyStatus?.masterConnected
        ? "Master linked"
        : "Not started";
  const brokerLinkLabel = usingMockData
    ? "Preview state"
    : tradeCopyStatus?.masterConnected
      ? "Master linked"
      : connectedAccountsCount > 0
        ? "Accounts linked"
        : "Awaiting session";
  const followerReadinessLabel = usingMockData
    ? "Preview state"
    : tradeCopyStatus
      ? `${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount} ready`
      : `${connectedAccountsCount}/${dashboardAccounts.length} active`;
  const riskShield = usingMockData
    ? "Preview"
    : tradeCopyStatus?.ready
      ? "Protected"
      : tradeCopyStatus?.masterConnected
        ? "Attention"
        : "Standby";

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest("POST", "/api/accounts", accountData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
  });

  const handleAddAccount = async (newAccount: AccountCreatePayload) => {
    try {
      await addAccountMutation.mutateAsync(newAccount);

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
      throw error;
    }
  };

  const handleConfigure = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    toast({
      title: "Settings Updated",
      description: `Configuration saved for ${account?.name}`,
    });
  };

  const connectAccountMutation = useMutation({
    mutationFn: (accountId: string) => connectAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ["/api/accounts"],
        (current) => updateAccountConnectionInQueryData(current, accountId, true),
      );
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: (accountId: string) => disconnectAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ["/api/accounts"],
        (current) => updateAccountConnectionInQueryData(current, accountId, false),
      );
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
  });

  const handleConnect = async (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);

    try {
      await connectAccountMutation.mutateAsync(accountId);
      toast({
        title: "Account Connected",
        description: `${account?.name} is now connected and will copy trades`,
      });
    } catch (error) {
      toast({
        title: "Failed to Connect Account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectClick = (accountId: string, accountName: string) => {
    setDisconnectAlert({ open: true, accountId, accountName });
  };

  const handleDisconnectConfirm = async () => {
    const account = accounts.find((item) => item.id === disconnectAlert.accountId);

    try {
      await disconnectAccountMutation.mutateAsync(disconnectAlert.accountId);
      toast({
        title: "Account Disconnected",
        description: `${account?.name} has been disconnected`,
        variant: "destructive",
      });
      setDisconnectAlert({ open: false, accountId: "", accountName: "" });
    } catch (error) {
      toast({
        title: "Failed to Disconnect Account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const livePositions = toDashboardPositionRows(positionSnapshotData?.accounts ?? []);
  const positions = usingMockData
    ? mockPositions
    : livePositions;

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
                  <span className="font-medium">{brokerLinkLabel}</span>
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
                <div className="mt-1 text-xs text-zinc-500">status based on live copy-session readiness</div>
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
              <h2 className="mt-2 text-2xl font-semibold text-white">Execution throughput and fill quality</h2>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300">
              {usingMockData
                ? `${mockPnlSeries[mockPnlSeries.length - 1].pnl} preview trades`
                : `${tradeHistorySummary.total} recent lifecycle events`}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Fill Rate</p>
              <p className="mt-2 text-xl font-semibold text-white">{usingMockData ? "72%" : `${filledRate}%`}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Busiest Day</p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">
                {usingMockData ? "Thu" : `${bestExecutionDay.label} (${bestExecutionDay.total})`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Most Failures</p>
              <p className="mt-2 text-xl font-semibold text-rose-300">
                {usingMockData ? "Tue" : `${highestFailureDay.label} (${highestFailureDay.failed})`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Best Fill Day</p>
              <p className="mt-2 text-xl font-semibold text-cyan-300">
                {usingMockData ? "Fri" : `${highestFilledDay.label} (${highestFilledDay.filled})`}
              </p>
            </div>
          </div>

          <div className="h-[360px] rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usingMockData ? mockPnlSeries : dailyExecutionSeries}>
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
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(7, 10, 16, 0.97)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "18px",
                    color: "#fff",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={usingMockData ? "equity" : "total"}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="url(#equityGlow)"
                />
                <Line
                  type="monotone"
                  dataKey={usingMockData ? "pnl" : "filled"}
                  stroke="#4ade80"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: "#4ade80" }}
                />
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
                {
                  label: "Broker session",
                  value: brokerLinkLabel,
                  positive: usingMockData ? true : !!tradeCopyStatus?.masterConnected,
                },
                {
                  label: "Copy engine",
                  value: copySessionLabel,
                  positive: usingMockData ? true : !!tradeCopyStatus?.ready,
                },
                {
                  label: "Follower readiness",
                  value: followerReadinessLabel,
                  positive: usingMockData
                    ? true
                    : !!tradeCopyStatus &&
                      tradeCopyStatus.followerCount > 0 &&
                      tradeCopyStatus.connectedFollowerCount === tradeCopyStatus.followerCount,
                },
                {
                  label: "Risk routing",
                  value: usingMockData
                    ? "Preview state"
                    : tradeCopyStatus?.ready
                      ? "Nominal"
                      : tradeCopyStatus?.masterConnected
                        ? "Needs review"
                        : "Standby",
                  positive: usingMockData ? true : !!tradeCopyStatus?.ready,
                },
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
                          disabled={account.isConnected}
                        >
                          Connect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.04] text-zinc-300"
                          onClick={() => handleDisconnectClick(account.id, account.name)}
                          disabled={!account.isConnected}
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
              {positions.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-zinc-400">
                  No live positions are available yet. Connected Tradovate and Tradeify accounts will appear here automatically.
                </div>
              ) : positions.map((position) => (
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
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Copy Group Pulse</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Runtime health and alert stream</h2>
              </div>
              <Layers3 className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Running</p>
                <p className="mt-2 text-xl font-semibold text-white">{copyGroupOverview.runningGroups}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Alerts</p>
                <p className="mt-2 text-xl font-semibold text-amber-300">
                  {copyGroupOverview.degradedGroups + copyGroupOverview.unhealthyGroups}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Followers Ready</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {copyGroupOverview.connectedFollowers}/{copyGroupOverview.totalFollowers}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Avg Dispatch</p>
                <p className="mt-2 text-xl font-semibold text-cyan-300">
                  {copyGroupOverview.avgDispatchLatencyMs === null
                    ? "No data"
                    : `${copyGroupOverview.avgDispatchLatencyMs.toFixed(1)} ms`}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <LiveActivityFeed
                activities={copyGroupAlerts.map((activity) => ({
                  id: activity.id,
                  timestamp: formatActivityTimestamp(activity.timestamp),
                  message: `${activity.groupName}: ${activity.message}`,
                  type: activity.type,
                }))}
              />
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
