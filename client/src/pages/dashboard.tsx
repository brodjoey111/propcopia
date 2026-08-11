import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { AccountCreatePayload } from "@/lib/account-create-payload";
import {
  buildCopySessionSignalRows,
  buildCopyGroupActivityFeed,
  describeCopyGroupPulse,
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
  type AccountLiveMetricsResponse,
} from "@/lib/account-live-metrics";
import {
  buildAccountRiskFollowUpQueue,
  buildAccountRiskById,
  toAccountRiskBadgeView,
} from "@/lib/account-risk";
import {
  buildPositionSyncReview,
  buildPositionSyncSummaryCards,
  describePositionSyncOverview,
  sortPositionSyncGroups,
} from "@/lib/position-sync";
import {
  buildPositionSyncWorkflowKey,
  toPositionSyncWorkflowState,
  type PositionSyncWorkflowSaveInput,
  type PositionSyncWorkflowState,
} from "@/lib/position-sync-workflow";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
  SESSION_STATUS_POLL_MS,
} from "@/lib/live-query-config";
import type { OperationsOverviewResponse } from "@/lib/operations-overview";
import type {
  DashboardRuntimeOverviewResponse,
  PositionSyncOverviewResponse,
} from "@/lib/runtime-overview";
import { type TradeHistoryDailySummary } from "@/lib/trade-history";
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
      health: "ready" | "reconnecting" | "unavailable";
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
  riskStatusLabel?: string;
  riskStatusTone?: "ok" | "warn" | "danger" | "muted";
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
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loadDetailSections, setLoadDetailSections] = useState(false);
  const [showAccountRoster, setShowAccountRoster] = useState(false);
  const [showOpenPositions, setShowOpenPositions] = useState(false);
  const [showCopyGroupDetail, setShowCopyGroupDetail] = useState(false);
  const [showPositionSyncDetail, setShowPositionSyncDetail] = useState(false);
  const [selectedPositionSyncGroupId, setSelectedPositionSyncGroupId] = useState<string | null>(null);
  const [positionSyncReviewNotes, setPositionSyncReviewNotes] = useState<Record<string, string>>({});
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
  const hasConnectedAccounts = accounts.some((account) => account.isConnected);
  const usingMockData = accounts.length === 0;
  const { data: authData } = useQuery<AuthMeResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoadDetailSections(true);
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (usingMockData) {
      setShowAccountRoster(true);
      setShowOpenPositions(true);
      setShowCopyGroupDetail(true);
      setShowPositionSyncDetail(true);
    }
  }, [usingMockData]);

  useEffect(() => {
    if (!showPositionSyncDetail) {
      setSelectedPositionSyncGroupId(null);
    }
  }, [showPositionSyncDetail]);
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
    enabled: !!authData?.user?.id && hasConnectedAccounts,
    refetchInterval: hasConnectedAccounts ? SESSION_STATUS_POLL_MS : false,
    refetchIntervalInBackground: false,
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
    enabled: !!authData?.user?.id && hasConnectedAccounts,
    refetchInterval: hasConnectedAccounts ? LIVE_QUERY_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: accountLiveMetricsData } = useQuery<AccountLiveMetricsResponse | null>({
    queryKey: authData?.user?.id ? ["/api/accounts/live-metrics", authData.user.id] : ["/api/accounts/live-metrics", "anonymous"],
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
    enabled:
      !!authData?.user?.id &&
      hasConnectedAccounts &&
      loadDetailSections &&
      (showAccountRoster || showOpenPositions),
    refetchInterval: hasConnectedAccounts ? LIVE_QUERY_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: positionSnapshotData } = useQuery<PositionSnapshotResponse | null>({
    queryKey: authData?.user?.id ? ["/api/positions/snapshot", authData.user.id] : ["/api/positions/snapshot", "anonymous"],
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
    enabled:
      !!authData?.user?.id &&
      hasConnectedAccounts &&
      loadDetailSections &&
      (showAccountRoster || showOpenPositions),
    refetchInterval: hasConnectedAccounts ? LIVE_QUERY_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: positionSyncDetailData } = useQuery<PositionSyncOverviewResponse | null>({
    queryKey: authData?.user?.id
      ? ["/api/position-sync/plans", authData.user.id, selectedPositionSyncGroupId ?? "all"]
      : ["/api/position-sync/plans", "anonymous", selectedPositionSyncGroupId ?? "all"],
    queryFn: async ({ queryKey }) => {
      const groupId = queryKey[2];
      const url =
        typeof groupId === "string" && groupId !== "all"
          ? `/api/position-sync/plans?groupId=${encodeURIComponent(groupId)}`
          : (queryKey[0] as string);
      const res = await fetch(url, {
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
    enabled:
      !!authData?.user?.id &&
      hasConnectedAccounts &&
      loadDetailSections &&
      showPositionSyncDetail &&
      !usingMockData,
    refetchInterval: hasConnectedAccounts ? LIVE_QUERY_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: positionSyncWorkflowData } = useQuery<{
    success: boolean;
    reviews: PositionSyncWorkflowSaveInput[];
  } | null>({
    queryKey: authData?.user?.id ? ["/api/position-sync/reviews", authData.user.id] : ["/api/position-sync/reviews", "anonymous"],
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
    enabled:
      !!authData?.user?.id &&
      hasConnectedAccounts &&
      loadDetailSections &&
      showPositionSyncDetail &&
      !usingMockData,
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
  const operationsOverviewData: OperationsOverviewResponse | null = runtimeOverviewData?.operationsOverview ?? null;
  const positionSyncOverview = runtimeOverviewData?.positionSyncOverview ?? null;
  const positionSyncDetailOverview = positionSyncDetailData ?? positionSyncOverview;
  const dashboardSummary = runtimeOverviewData?.dashboardSummary ?? null;
  const accountBalanceMetricsById = buildAccountBalanceMetricsById(accountLiveMetricsData?.accounts ?? []);
  const accountRiskOverview = runtimeOverviewData?.accountRiskOverview;
  const accountRiskById = buildAccountRiskById(accountRiskOverview?.accounts ?? []);
  const positionMetricsById = buildAccountLiveMetricsById(positionSnapshotData?.accounts ?? []);
  const positionSyncWorkflowState: PositionSyncWorkflowState = positionSyncWorkflowData?.reviews
    ? toPositionSyncWorkflowState(positionSyncWorkflowData.reviews)
    : {};
  const tradeAnalytics = runtimeOverviewData?.tradeAnalytics;
  const hydratedCopyGroups = copyGroupSnapshotData?.groups.map((group) => hydrateCopyGroup(group)) ?? [];
  const copyGroupFeed = copyGroupSnapshotData
    ? buildCopyGroupActivityFeed(
        hydratedCopyGroups,
        Object.fromEntries(
          copyGroupSnapshotData.groups.map((group) => [group.group.group.groupId, group.activityPreview]),
        ),
      )
    : [];
  const refreshAccountsQuery = () => queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
  const refreshAccountLiveMetricsQuery = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/accounts/live-metrics"] });
  const refreshPositionSnapshotQuery = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/positions/snapshot"] });
  const refreshTradeCopyStatusQuery = () => queryClient.invalidateQueries({ queryKey: ["/api/trade-copy/status"] });
  const refreshDashboardRuntimeOverviewQuery = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] });
  const refreshDashboardSessionData = () => {
    refreshAccountsQuery();
    refreshAccountLiveMetricsQuery();
    refreshPositionSnapshotQuery();
    refreshTradeCopyStatusQuery();
    refreshDashboardRuntimeOverviewQuery();
  };
  const breachedRiskCount = accountRiskOverview?.summary.breachedAccounts ?? 0;
  const warningRiskCount = accountRiskOverview?.summary.warningAccounts ?? 0;
  const riskFollowUpItems = buildAccountRiskFollowUpQueue(accountRiskOverview?.accounts ?? []).slice(0, 4);

  const dashboardAccounts: DashboardAccountView[] = usingMockData
    ? mockAccounts
    : accounts.map((account) => {
        const numericPnl = account.pnl ? parseFloat(account.pnl) : 0;
        const liveBalanceMetrics = accountBalanceMetricsById[account.id];
        const livePositionMetrics = positionMetricsById[account.id];
        const riskBadge = toAccountRiskBadgeView(accountRiskById[account.id]);
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
          riskStatusLabel: riskBadge.label,
          riskStatusTone: riskBadge.tone,
        };
      });

  const totalBalance = dashboardSummary?.totalBalance
    ?? dashboardAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalDailyPnl = dashboardSummary?.totalDailyPnl
    ?? dashboardAccounts.reduce((sum, account) => sum + account.dailyPnl, 0);
  const connectedAccountsCount = dashboardSummary?.connectedAccounts
    ?? dashboardAccounts.filter((account) => account.isConnected).length;
  const disconnectedAccountsCount = dashboardSummary?.disconnectedAccounts
    ?? (dashboardAccounts.length - connectedAccountsCount);

  const totalBuyingPower = dashboardSummary?.totalBuyingPower ?? (totalBalance * 1.92);
  const tradeHistorySummary = tradeAnalytics?.summary ?? {
    total: 0,
    filled: 0,
    failed: 0,
    pending: 0,
    skippedOrRejected: 0,
  };
  const dailyExecutionSeries: TradeHistoryDailySummary[] = tradeAnalytics?.dailyExecutionSeries ?? [];
  const executionAttentionCards = tradeAnalytics?.attentionCards ?? [];
  const recentTradeRows = tradeAnalytics?.recentPathRows ?? [];
  const executionRecovery: NonNullable<DashboardRuntimeOverviewResponse["tradeAnalytics"]>["executionRecovery"] =
    tradeAnalytics?.executionRecovery ?? {
    headline: "No recent executions",
    detail: "Execution recovery will appear here once recent order activity is available.",
    tone: "muted" as const,
    staleThresholdMinutes: 5,
    primaryActionLabel: "Waiting for recovery candidates",
    counts: {
      failed: 0,
      stale: 0,
      partial: 0,
      active: 0,
      completed: 0,
    },
    actionCounts: [],
    items: [],
  };
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
  const reconnectingFollowers = tradeCopyStatus?.followers.filter(
    (follower) => follower.health === "reconnecting",
  ) ?? [];
  const unavailableFollowers = tradeCopyStatus?.followers.filter(
    (follower) => follower.health === "unavailable",
  ) ?? [];
  const followerNameById = new Map(dashboardAccounts.map((account) => [account.id, account.name]));
  const followerHealthRows = tradeCopyStatus?.followers
    .filter((follower) => follower.health !== "ready")
    .map((follower) => ({
      accountId: follower.accountId,
      name: followerNameById.get(follower.accountId) ?? follower.accountId,
      health: follower.health,
    })) ?? [];
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
  const copyGroupPulse = describeCopyGroupPulse(copyGroupOverview);
  const positionSyncPulse = describePositionSyncOverview(positionSyncOverview);
  const positionSyncCards = buildPositionSyncSummaryCards(positionSyncOverview);
  const positionSyncSummaryGroups = showPositionSyncDetail
    ? sortPositionSyncGroups(positionSyncOverview?.groups ?? [])
    : [];
  const positionSyncPlanGroups = showPositionSyncDetail
    ? sortPositionSyncGroups(positionSyncDetailOverview?.groups ?? [])
    : [];
  const positionSyncReviewGroups = showPositionSyncDetail
    ? buildPositionSyncReview(positionSyncDetailOverview?.groups ?? []).slice(0, 2)
    : [];
  const copyGroupAlerts = showCopyGroupDetail
    ? (
      operationsOverviewData
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
        : filterCopyGroupActivityFeed(copyGroupFeed, "alerts").slice(0, 8)
    )
    : [];
  const copyGroupFollowUpItems = hydratedCopyGroups
    .map((group, index) => ({
      groupId: group.groupId,
      groupName: group.name,
      runtimeSummary: copyGroupSnapshotData?.groups[index]?.runtimeSummary,
    }))
    .filter((group) => group.runtimeSummary)
    .filter((group) =>
      group.runtimeSummary?.tone === "danger" ||
      group.runtimeSummary?.tone === "warn" ||
      group.runtimeSummary?.label === "Restored offline",
    )
    .slice(0, 4);
  const totalUnrealizedPnl = dashboardSummary?.totalUnrealizedPnl
    ?? positionSnapshotData?.accounts?.reduce(
      (sum, account) =>
        sum + account.positions.reduce((positionSum, position) => positionSum + (position.unrealizedPnl ?? 0), 0),
      0,
    )
    ?? dashboardAccounts.reduce((sum, account) => sum + account.unrealizedPnl, 0);
  const totalOpenPositions = dashboardSummary?.totalOpenPositions
    ?? operationsOverviewData?.positions.totalOpenPositions
    ?? positionSnapshotData?.summary.totalOpenPositions
    ?? dashboardAccounts.reduce((sum, account) => sum + account.openPositions, 0);
  const riskShield = usingMockData
    ? "Preview state"
    : breachedRiskCount > 0
      ? "Breached"
      : warningRiskCount > 0
        ? "Watchlist"
        : unavailableFollowers.length > 0
          ? "Needs attention"
          : tradeCopyStatus?.ready
            ? "Protected"
            : tradeCopyStatus?.masterConnected
              ? "Needs review"
              : "Not started";
  const matrixRows = buildCopySessionSignalRows({
    usingMockData,
    connectedAccountsCount,
    totalAccountsCount: dashboardSummary?.totalAccounts ?? dashboardAccounts.length,
    breachedRiskCount,
    warningRiskCount,
    tradeCopyStatus,
  });

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest("POST", "/api/accounts", accountData);
      return response.json();
    },
    onSuccess: refreshAccountsQuery,
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
      refreshDashboardSessionData();
    },
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: (accountId: string) => disconnectAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ["/api/accounts"],
        (current) => updateAccountConnectionInQueryData(current, accountId, false),
      );
      refreshDashboardSessionData();
    },
  });

  const recheckExecutionRecoveryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/runtime/dashboard-overview/recheck");
      return response.json();
    },
    onSuccess: () => {
      refreshDashboardRuntimeOverviewQuery();
    },
  });

  const recheckExecutionRecoveryItemMutation = useMutation({
    mutationFn: async (historyId: string) => {
      const response = await apiRequest("POST", `/api/runtime/dashboard-overview/recheck/${historyId}`);
      return response.json() as Promise<{
        success: boolean;
        historyId: string;
        recoveryItem: { symbol: string; headline: string } | null;
      }>;
    },
    onSuccess: () => {
      refreshDashboardRuntimeOverviewQuery();
    },
  });

  const reviewExecutionRecoveryItemMutation = useMutation({
    mutationFn: async ({ historyId, note }: { historyId: string; note?: string }) => {
      const response = await apiRequest("POST", `/api/runtime/dashboard-overview/review/${historyId}`, {
        note,
      });
      return response.json() as Promise<{
        success: boolean;
        historyId: string;
        recoveryItem: { symbol: string; headline: string; reviewStatus?: "pending" | "reviewed" } | null;
      }>;
    },
    onSuccess: () => {
      refreshDashboardRuntimeOverviewQuery();
    },
  });
  const savePositionSyncWorkflowMutation = useMutation({
    mutationFn: async (reviews: PositionSyncWorkflowSaveInput[]) => {
      const response = await apiRequest("POST", "/api/position-sync/reviews", {
        reviews,
      });
      return response.json() as Promise<{
        success: boolean;
        reviews: PositionSyncWorkflowSaveInput[];
      }>;
    },
    onSuccess: (result, reviews) => {
      queryClient.setQueryData(
        authData?.user?.id ? ["/api/position-sync/reviews", authData.user.id] : ["/api/position-sync/reviews", "anonymous"],
        result,
      );

      const savedFollowerCount = reviews.length;
      const hasReviewedEntry = reviews.some((review) => review.status === "reviewed");
      if (hasReviewedEntry) {
        setPositionSyncReviewNotes((current) => {
          const next = { ...current };
          for (const review of reviews) {
            delete next[buildPositionSyncWorkflowKey(review.groupId, review.followerAccountId)];
          }
          return next;
        });
      }

      toast({
        title: hasReviewedEntry ? "Sync Review Saved" : "Simulated Sync Prepared",
        description: hasReviewedEntry
          ? "This follower sync plan is now shared across your signed-in sessions."
          : `${savedFollowerCount} follower plan${savedFollowerCount === 1 ? "" : "s"} marked for manual sync review only.`,
      });
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

  const handleExecutionRecoveryRecheck = async () => {
    try {
      await recheckExecutionRecoveryMutation.mutateAsync();
      toast({
        title: "Recovery State Rechecked",
        description: "Execution recovery was refreshed from the latest stored lifecycle activity.",
      });
    } catch (error) {
      toast({
        title: "Recovery Recheck Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleExecutionRecoveryItemRecheck = async (historyId: string) => {
    try {
      const result = await recheckExecutionRecoveryItemMutation.mutateAsync(historyId);
      toast({
        title: "Execution Rechecked",
        description: result.recoveryItem
          ? `${result.recoveryItem.symbol} is still flagged as ${result.recoveryItem.headline.toLowerCase()}.`
          : "That execution is no longer showing as a recovery candidate.",
      });
    } catch (error) {
      toast({
        title: "Execution Recheck Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleExecutionRecoveryItemReview = async (historyId: string) => {
    try {
      const note = reviewNotes[historyId]?.trim();
      const result = await reviewExecutionRecoveryItemMutation.mutateAsync({
        historyId,
        note: note && note.length > 0 ? note : undefined,
      });
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[historyId];
        return next;
      });
      toast({
        title: "Failure Reviewed",
        description: result.recoveryItem?.reviewStatus === "reviewed"
          ? "That recovery item is now marked as reviewed."
          : "The recovery item was refreshed after review.",
      });
    } catch (error) {
      toast({
        title: "Review Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handlePositionSyncReview = (groupId: string, followerAccountId: string) => {
    const workflowKey = buildPositionSyncWorkflowKey(groupId, followerAccountId);
    const trimmedNote = positionSyncReviewNotes[workflowKey]?.trim();
    const reviewedAt = new Date().toISOString();

    savePositionSyncWorkflowMutation.mutate([
      {
        groupId,
        followerAccountId,
        status: "reviewed",
        note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : undefined,
        reviewedAt,
        simulatedAt: positionSyncWorkflowState[workflowKey]?.simulatedAt,
      },
    ]);
  };

  const handlePositionSyncSimulation = (groupId: string) => {
    const reviewGroup = positionSyncReviewGroups.find((group) => group.groupId === groupId);
    if (!reviewGroup) {
      return;
    }

    const simulatedAt = new Date().toISOString();

    savePositionSyncWorkflowMutation.mutate(
      reviewGroup.followers.map((follower) => {
        const workflowKey = buildPositionSyncWorkflowKey(groupId, follower.followerAccountId);

        return {
          groupId,
          followerAccountId: follower.followerAccountId,
          status: "simulated" as const,
          note: positionSyncReviewNotes[workflowKey]?.trim() || positionSyncWorkflowState[workflowKey]?.note,
          reviewedAt: positionSyncWorkflowState[workflowKey]?.reviewedAt,
          simulatedAt,
        };
      }),
    );
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
                  <span className="font-medium">{matrixRows[0]?.value ?? "Not started"}</span>
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

          <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Execution Paths</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Recent lifecycle paths using the same stage language as the Trades view.
                </p>
              </div>
              <div className="text-xs text-zinc-500">
                {recentTradeRows.length === 0 ? "Waiting for records" : `${recentTradeRows.length} in view`}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {executionAttentionCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{card.label}</p>
                      <p
                        className={`mt-2 text-2xl font-semibold ${
                          card.tone === "alert"
                            ? "text-red-200"
                            : card.tone === "watch"
                              ? "text-amber-200"
                              : "text-emerald-200"
                        }`}
                      >
                        {card.value}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        card.tone === "alert"
                          ? "border-red-400/30 bg-red-400/10 text-red-200"
                          : card.tone === "watch"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      }
                    >
                      {card.tone === "alert"
                        ? "Needs review"
                        : card.tone === "watch"
                          ? "Waiting"
                          : "Clear"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{card.detail}</p>
                </div>
              ))}
            </div>

            <div
              className={`mt-4 rounded-2xl border p-4 ${
                executionRecovery.tone === "danger"
                  ? "border-red-400/25 bg-red-400/8"
                  : executionRecovery.tone === "warn"
                    ? "border-amber-400/25 bg-amber-400/8"
                    : executionRecovery.tone === "ok"
                      ? "border-emerald-400/25 bg-emerald-400/8"
                      : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Recovery Snapshot</p>
                  <p className="mt-2 text-sm font-semibold text-white">{executionRecovery.headline}</p>
                  <p className="mt-1 text-sm text-zinc-400">{executionRecovery.detail}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    executionRecovery.tone === "danger"
                      ? "border-red-400/30 bg-red-400/10 text-red-200"
                      : executionRecovery.tone === "warn"
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                        : executionRecovery.tone === "ok"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-zinc-300"
                  }
                >
                  {executionRecovery.tone === "danger"
                    ? "Needs recovery"
                    : executionRecovery.tone === "warn"
                      ? "Watch closely"
                      : executionRecovery.tone === "ok"
                        ? "Flowing"
                        : "Idle"}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Failed", value: executionRecovery.counts.failed },
                  { label: "Stale", value: executionRecovery.counts.stale },
                  { label: "Partial", value: executionRecovery.counts.partial },
                  { label: "Active", value: executionRecovery.counts.active },
                  { label: "Cleared", value: executionRecovery.counts.completed },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Stale executions are orders that have been in flight for more than {executionRecovery.staleThresholdMinutes} minutes.
              </p>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Primary Action</p>
                    <p className="mt-2 text-sm font-semibold text-white">{executionRecovery.primaryActionLabel}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-zinc-500">
                    {executionRecovery.actionCounts.length === 0
                      ? "No queued follow-up"
                      : `${executionRecovery.actionCounts.length} action type${executionRecovery.actionCounts.length === 1 ? "" : "s"}`}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                    onClick={handleExecutionRecoveryRecheck}
                    disabled={recheckExecutionRecoveryMutation.isPending}
                  >
                    {recheckExecutionRecoveryMutation.isPending ? "Rechecking..." : "Recheck Recovery State"}
                  </Button>
                </div>

                {executionRecovery.actionCounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {executionRecovery.actionCounts.map((action) => (
                      <div
                        key={action.action}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300"
                      >
                        <span>{action.label}</span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-200">
                          {action.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {executionRecovery.items.length > 0 ? (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {executionRecovery.items.map((item) => (
                    <div key={item.historyId} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.symbol}</p>
                          <p className="mt-1 text-xs text-zinc-400">{item.followerAccountId}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            item.category === "failed"
                              ? "border-red-400/30 bg-red-400/10 text-red-200"
                              : item.category === "stale"
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                                : item.category === "partial"
                                  ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
                                  : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          }
                        >
                          {item.headline}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-zinc-300">{item.detail}</p>
                      {item.category === "failed" && item.reviewStatus !== "reviewed" ? (
                        <div className="mt-3">
                          <Textarea
                            value={reviewNotes[item.historyId] ?? ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [item.historyId]: event.target.value,
                              }))
                            }
                            placeholder="Add a short review note before marking this failure reviewed"
                            className="min-h-[88px] border-white/10 bg-white/[0.03] text-sm text-zinc-100 placeholder:text-zinc-500"
                          />
                        </div>
                      ) : null}
                      <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300">
                        {item.recommendedActionLabel}
                      </div>
                      {item.reviewStatus === "reviewed" ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-emerald-300">
                          Reviewed{item.reviewedAt ? ` at ${new Date(item.reviewedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}.
                          </p>
                          {item.reviewNote ? (
                            <p className="text-xs text-zinc-400">{item.reviewNote}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                            onClick={() => handleExecutionRecoveryItemRecheck(item.historyId)}
                            disabled={recheckExecutionRecoveryItemMutation.isPending}
                          >
                            {recheckExecutionRecoveryItemMutation.isPending &&
                            recheckExecutionRecoveryItemMutation.variables === item.historyId
                              ? "Rechecking item..."
                              : "Recheck This Execution"}
                          </Button>
                          {item.category === "failed" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                              onClick={() => handleExecutionRecoveryItemReview(item.historyId)}
                              disabled={reviewExecutionRecoveryItemMutation.isPending || item.reviewStatus === "reviewed"}
                            >
                              {reviewExecutionRecoveryItemMutation.isPending &&
                              reviewExecutionRecoveryItemMutation.variables?.historyId === item.historyId
                                ? "Saving review..."
                                : item.reviewStatus === "reviewed"
                                  ? "Reviewed"
                                  : "Mark Reviewed"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {item.lifecycleStatus.replaceAll("_", " ")} | {item.ageMinutes}m ago
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {recentTradeRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-400 xl:col-span-3">
                  Execution paths will appear here once follower lifecycle records are available.
                </div>
              ) : (
                recentTradeRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.symbol}</p>
                        <p className="mt-1 text-xs text-zinc-400">{row.followerAccountLabel}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          row.attentionState === "alert"
                            ? "border-red-400/30 bg-red-400/10 text-red-200"
                            : row.attentionState === "watch"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                              : row.statusTone === "success"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                            : "border-white/10 bg-white/[0.03] text-zinc-300"
                        }
                      >
                        {row.attentionLabel}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm text-zinc-300">{row.executionSummary.detail}</p>
                    <p className="mt-1 text-xs text-zinc-500">{row.executionSummary.headline}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.detail.stageFlow.map((stage) => (
                        <div
                          key={`${row.id}-${stage.key}`}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            stage.state === "done"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                              : stage.state === "active"
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                                : "border-white/10 bg-white/[0.03] text-zinc-500"
                          }`}
                        >
                          {stage.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
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
              {matrixRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{row.label}</p>
                  <p className="mt-1 text-sm text-zinc-300">{row.value}</p>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    row.state === "ok"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : row.state === "alert"
                        ? "bg-red-400/10 text-red-300"
                        : row.state === "watch"
                          ? "bg-amber-400/10 text-amber-300"
                          : "bg-white/[0.06] text-zinc-300"
                  }`}
                >
                  {row.state === "ok"
                    ? "OK"
                    : row.state === "alert"
                      ? "Alert"
                      : row.state === "watch"
                        ? "Watch"
                        : "Not started"}
                </div>
              </div>
            ))}
          </div>

          {riskFollowUpItems.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Risk Follow-Up</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Accounts that need a manual risk decision before the next copy session.
                  </p>
                </div>
                <ShieldCheck className="h-4 w-4 text-zinc-500" />
              </div>

              {riskFollowUpItems.map((item) => (
                <div
                  key={item.accountId}
                  className={`rounded-2xl border p-4 ${
                    item.tone === "danger"
                      ? "border-red-500/20 bg-red-500/10"
                      : item.tone === "warn"
                        ? "border-amber-500/20 bg-amber-500/10"
                        : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.accountName}</p>
                      <p className="mt-1 text-xs text-zinc-300">{item.headline}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.tone === "danger"
                          ? "border-red-400/20 bg-red-400/10 text-red-300"
                          : item.tone === "warn"
                            ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                            : "border-white/10 bg-white/[0.04] text-zinc-300"
                      }
                    >
                      {item.status === "BREACHED"
                        ? "Hold"
                        : item.status === "WARN"
                          ? "Review"
                          : "Pending"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">{item.detail}</p>
                  <p className="mt-2 text-xs text-zinc-500">{item.recommendedAction}</p>
                </div>
              ))}
            </div>
          )}

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
                {!usingMockData && followerHealthRows.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {followerHealthRows.slice(0, 3).map((follower) => (
                      <Badge
                        key={follower.accountId}
                        variant="outline"
                        className={
                          follower.health === "unavailable"
                            ? "border-red-400/30 bg-red-400/10 text-red-300"
                            : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        }
                      >
                        {follower.name}: {follower.health === "unavailable" ? "Needs attention" : "Reconnecting"}
                      </Badge>
                    ))}
                    {followerHealthRows.length > 3 && (
                      <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                        +{followerHealthRows.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
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
            <div className="flex items-center gap-2">
              {!usingMockData && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/[0.04] text-zinc-300"
                  onClick={() => setShowAccountRoster((current) => !current)}
                >
                  {showAccountRoster ? "Hide roster" : "Load roster"}
                </Button>
              )}
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                {usingMockData ? "UI preview data" : "live data"}
              </Badge>
            </div>
          </div>

          {!usingMockData && !showAccountRoster ? (
            <Card className="border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
              Load the account roster when you want detailed balance, P&amp;L, and per-account controls.
            </Card>
          ) : (
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
                          {account.riskStatusLabel && (
                            <Badge
                              variant="outline"
                              className={
                                account.riskStatusTone === "ok"
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : account.riskStatusTone === "warn"
                                    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                                    : account.riskStatusTone === "danger"
                                      ? "border-red-400/20 bg-red-400/10 text-red-300"
                                      : "border-white/10 bg-white/[0.04] text-zinc-300"
                              }
                            >
                              {account.riskStatusLabel}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-zinc-500">
                          {account.platform} • {account.accountId}
                        </p>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${account.isConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {account.isConnected ? "Connected" : "Not connected"}
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
          )}
        </section>

        <section className="space-y-4">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Execution Watch</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Open positions</h2>
              </div>
              <div className="flex items-center gap-2">
                {!usingMockData && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/[0.04] text-zinc-300"
                    onClick={() => setShowOpenPositions((current) => !current)}
                  >
                    {showOpenPositions ? "Hide positions" : "Load positions"}
                  </Button>
                )}
                <BriefcaseBusiness className="h-5 w-5 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-3">
              {!usingMockData && !showOpenPositions ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-400">
                  Load open positions when you want the live symbol, size, and unrealized P&amp;L breakdown.
                </div>
              ) : positions.length === 0 ? (
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
                <h2 className="mt-2 text-2xl font-semibold text-white">{copyGroupPulse.headline}</h2>
                <p className="mt-2 text-sm text-zinc-400">{copyGroupPulse.detail}</p>
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

            <div className="mt-4 space-y-3">
              {copyGroupFollowUpItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Operator Follow-Up</p>
                  {copyGroupFollowUpItems.map((item) => (
                    <div
                      key={item.groupId}
                      className={`rounded-2xl border p-3 ${
                        item.runtimeSummary?.tone === "danger"
                          ? "border-red-500/20 bg-red-500/10"
                          : "border-amber-500/20 bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.groupName}</p>
                          <p className="mt-1 text-xs text-zinc-300">{item.runtimeSummary?.label}</p>
                        </div>
                        {item.runtimeSummary?.updatedLabel && (
                          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            {item.runtimeSummary.updatedLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">
                        {item.runtimeSummary?.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] text-xs text-zinc-200 hover:bg-white/[0.08]"
                  onClick={() => setShowCopyGroupDetail((current) => !current)}
                >
                  {showCopyGroupDetail ? "Hide alerts" : "Load alerts"}
                </Button>
              </div>

              {showCopyGroupDetail ? (
                <LiveActivityFeed
                  activities={copyGroupAlerts.map((activity) => ({
                    id: activity.id,
                    timestamp: formatActivityTimestamp(activity.timestamp),
                    message: `${activity.groupName}: ${activity.message}`,
                    type: activity.type,
                  }))}
                />
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-zinc-400">
                  Load the live copy-group alert feed when you want recent routing and follower-health updates.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Position Sync</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{positionSyncPulse.headline}</h2>
                <p className="mt-2 text-sm text-zinc-400">{positionSyncPulse.detail}</p>
              </div>
              <Gauge className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {positionSyncCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{card.label}</p>
                  <p
                    className={`mt-2 text-xl font-semibold ${
                      card.tone === "danger"
                        ? "text-red-300"
                        : card.tone === "warn"
                          ? "text-amber-300"
                          : card.tone === "ok"
                            ? "text-emerald-300"
                            : "text-zinc-200"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] text-xs text-zinc-200 hover:bg-white/[0.08]"
                  onClick={() => setShowPositionSyncDetail((current) => !current)}
                >
                  {showPositionSyncDetail ? "Hide sync detail" : "Load sync detail"}
                </Button>
              </div>

              {showPositionSyncDetail ? (
                <>
                  <div className="space-y-3">
                    {!usingMockData && positionSyncSummaryGroups.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {positionSyncSummaryGroups.slice(0, 4).map((group) => (
                          <Button
                            key={group.groupId}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={
                              selectedPositionSyncGroupId === group.groupId
                                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                                : "border-white/10 bg-white/[0.03] text-zinc-300"
                            }
                            onClick={() => setSelectedPositionSyncGroupId(group.groupId)}
                          >
                            {group.groupName}
                          </Button>
                        ))}
                        {selectedPositionSyncGroupId && positionSyncSummaryGroups.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-zinc-200"
                            onClick={() => setSelectedPositionSyncGroupId(null)}
                          >
                            Show all groups
                          </Button>
                        )}
                      </div>
                    )}

                    {positionSyncSummaryGroups.length === 0 ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-zinc-400">
                        Position alignment will appear here after copy groups and live snapshots are available.
                      </div>
                    ) : (
                      positionSyncSummaryGroups.slice(0, 3).map((group) => (
                        <div key={group.groupId} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{group.groupName}</p>
                              <p className="mt-1 text-sm text-zinc-400">{group.summary}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!usingMockData && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-zinc-400 hover:text-zinc-200"
                                  onClick={() => setSelectedPositionSyncGroupId(group.groupId)}
                                >
                                  Inspect plan
                                </Button>
                              )}
                              <Badge
                                variant="outline"
                                className={
                                  group.status === "OUT_OF_SYNC"
                                    ? "border-red-400/30 bg-red-400/10 text-red-300"
                                    : group.status === "UNAVAILABLE"
                                      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                }
                              >
                                {group.status === "OUT_OF_SYNC"
                                  ? "Adjustments needed"
                                  : group.status === "UNAVAILABLE"
                                    ? "Waiting on positions"
                                    : "In sync"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!usingMockData && positionSyncPlanGroups.length > 0 && (
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-zinc-300">
                      {selectedPositionSyncGroupId
                        ? "Focused plan view is showing one copy group at a time."
                        : "Review is showing all copy groups with live sync plans."}
                    </div>
                  )}

                  {positionSyncReviewGroups.length > 0 && (
                    <div className="grid grid-cols-1 gap-3">
                      {positionSyncReviewGroups.map((group) => (
                        <div key={group.groupId} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{group.groupName}</p>
                              <p className="mt-1 text-xs text-zinc-500">Master: {group.masterAccountName}</p>
                              <p className="mt-2 text-sm text-zinc-400">{group.summary}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                group.status === "OUT_OF_SYNC"
                                  ? "border-red-400/30 bg-red-400/10 text-red-300"
                                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              }
                            >
                              {group.status === "OUT_OF_SYNC" ? "Review plan" : "Waiting"}
                            </Badge>
                          </div>

                          {!usingMockData && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15"
                                onClick={() => handlePositionSyncSimulation(group.groupId)}
                              >
                                Simulate sync
                              </Button>
                              <p className="text-xs text-zinc-500">
                                Simulation markers are shared across signed-in sessions and do not send broker orders.
                              </p>
                            </div>
                          )}

                          <div className="mt-3 space-y-3">
                            {group.followers.slice(0, 2).map((follower) => {
                              const workflowKey = buildPositionSyncWorkflowKey(group.groupId, follower.followerAccountId);
                              const workflowEntry = positionSyncWorkflowState[workflowKey];

                              return (
                                <div key={follower.followerAccountId} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-white">{follower.followerName}</p>
                                    <p className="mt-1 text-xs text-zinc-400">{follower.summary}</p>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {workflowEntry?.status === "reviewed" && (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                      >
                                        Reviewed
                                      </Badge>
                                    )}
                                    {workflowEntry?.status === "approved" && (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                      >
                                        Approved
                                      </Badge>
                                    )}
                                    {workflowEntry?.status === "handed_off" && (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-400/30 bg-amber-400/10 text-amber-100"
                                      >
                                        Handed Off
                                      </Badge>
                                    )}
                                    {workflowEntry?.status === "completed_manually" && (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                                      >
                                        Completed Manually
                                      </Badge>
                                    )}
                                    {workflowEntry?.status === "simulated" && (
                                      <Badge
                                        variant="outline"
                                        className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                                      >
                                        Simulated
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={
                                        follower.status === "OUT_OF_SYNC"
                                          ? "border-red-400/30 bg-red-400/10 text-red-300"
                                          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                                      }
                                    >
                                      {follower.status === "OUT_OF_SYNC"
                                        ? `${follower.adjustmentCount} adjustment${follower.adjustmentCount === 1 ? "" : "s"}`
                                        : "Waiting"}
                                    </Badge>
                                  </div>
                                </div>

                                {follower.adjustments.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {follower.adjustments.slice(0, 2).map((adjustment) => (
                                      <div
                                        key={`${follower.followerAccountId}-${adjustment.symbol}-${adjustment.actionLabel}`}
                                        className="rounded-lg border border-white/8 bg-black/10 px-3 py-2"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-xs font-semibold text-white">{adjustment.symbol}</span>
                                          <span className="text-xs text-red-300">{adjustment.actionLabel}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-400">{adjustment.detail}</p>
                                      </div>
                                    ))}
                                    {follower.adjustments.length > 2 && (
                                      <p className="text-xs text-zinc-500">
                                        +{follower.adjustments.length - 2} more planned adjustment{follower.adjustments.length - 2 === 1 ? "" : "s"}.
                                      </p>
                                    )}
                                  </div>
                                )}

                                {!usingMockData && (
                                  <div className="mt-3 space-y-3 rounded-xl border border-white/8 bg-black/10 p-3">
                                    <Textarea
                                      value={positionSyncReviewNotes[workflowKey] ?? workflowEntry?.note ?? ""}
                                      onChange={(event) =>
                                        setPositionSyncReviewNotes((current) => ({
                                          ...current,
                                          [workflowKey]: event.target.value,
                                        }))}
                                      placeholder="Add an operator note for this sync plan"
                                      className="min-h-[88px] border-white/10 bg-white/[0.03] text-sm text-zinc-100 placeholder:text-zinc-500"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="bg-white text-black hover:bg-zinc-200"
                                        onClick={() => handlePositionSyncReview(group.groupId, follower.followerAccountId)}
                                      >
                                        Mark reviewed
                                      </Button>
                                      {workflowEntry?.reviewedAt && (
                                        <p className="text-xs text-zinc-500">
                                          Reviewed on {new Date(workflowEntry.reviewedAt).toLocaleString()}.
                                        </p>
                                      )}
                                      {workflowEntry?.operatorName && (
                                        <p className="text-xs text-zinc-500">
                                          Operator owner: {workflowEntry.operatorName}.
                                        </p>
                                      )}
                                      {(workflowEntry?.operatorHistory?.length ?? 0) > 1 && (
                                        <p className="text-xs text-zinc-500">
                                          Ownership changes: {(workflowEntry?.operatorHistory?.length ?? 0) - 1}.
                                        </p>
                                      )}
                                      {workflowEntry?.operatorHistory?.[workflowEntry.operatorHistory.length - 1]?.reason && (
                                        <p className="text-xs text-zinc-500">
                                          Latest ownership reason: {workflowEntry.operatorHistory[workflowEntry.operatorHistory.length - 1]?.reason}.
                                        </p>
                                      )}
                                      {(workflowEntry?.operatorHistory?.length ?? 0) > 0 && (
                                        <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3">
                                          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                                            Ownership Timeline
                                          </p>
                                          <div className="mt-2 space-y-2">
                                            {workflowEntry?.operatorHistory?.map((assignment, index) => (
                                              <div
                                                key={`${workflowKey}-assignment-${index}`}
                                                className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                                              >
                                                <p className="text-zinc-200">
                                                  {assignment.operatorName} on {new Date(assignment.assignedAt).toLocaleString()}.
                                                </p>
                                                {assignment.reason && (
                                                  <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {workflowEntry?.approvedAt && (
                                        <p className="text-xs text-zinc-500">
                                          Approved on {new Date(workflowEntry.approvedAt).toLocaleString()}.
                                        </p>
                                      )}
                                      {workflowEntry?.handedOffAt && (
                                        <p className="text-xs text-zinc-500">
                                          Handed off on {new Date(workflowEntry.handedOffAt).toLocaleString()}.
                                        </p>
                                      )}
                                      {workflowEntry?.completedManuallyAt && (
                                        <p className="text-xs text-zinc-500">
                                          Completed manually on {new Date(workflowEntry.completedManuallyAt).toLocaleString()}.
                                        </p>
                                      )}
                                      {!workflowEntry?.reviewedAt && workflowEntry?.simulatedAt && (
                                        <p className="text-xs text-zinc-500">
                                          Simulated on {new Date(workflowEntry.simulatedAt).toLocaleString()}.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                </div>
                              );
                            })}
                            {group.followers.length > 2 && (
                              <p className="text-xs text-zinc-500">
                                +{group.followers.length - 2} more follower{group.followers.length - 2 === 1 ? "" : "s"} in this review.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-zinc-400">
                  Load position-sync detail when you want per-group sync status and follower review items.
                </div>
              )}
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
