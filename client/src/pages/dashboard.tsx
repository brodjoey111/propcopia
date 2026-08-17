import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { DashboardAccountRosterPanel } from "@/components/dashboard-account-roster-panel";
import { DashboardExecutionFollowUpGrid } from "@/components/dashboard-execution-follow-up-grid";
import { DashboardPositionSyncPanel } from "@/components/dashboard-position-sync-panel";
import { DashboardRithmicReadinessPanel } from "@/components/dashboard-rithmic-readiness-panel";
import { DashboardSignalMatrixPanel } from "@/components/dashboard-signal-matrix-panel";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboardDetailPreferences } from "@/hooks/use-dashboard-detail-preferences";
import { useDashboardExecutionFollowUp } from "@/hooks/use-dashboard-execution-follow-up";
import { useFollowUpReviewData } from "@/hooks/use-follow-up-review-data";
import { useDashboardPositionSyncData } from "@/hooks/use-dashboard-position-sync-data";
import { useDashboardPositionSyncWorkflow } from "@/hooks/use-dashboard-position-sync-workflow";
import { useFollowUpReviewActions } from "@/hooks/use-follow-up-review-actions";
import { useNotifications } from "@/hooks/use-notifications";
import { useOperatorFollowUpData } from "@/hooks/use-operator-follow-up-data";
import { usePositionSyncWorkflowActions } from "@/hooks/use-position-sync-workflow-actions";
import { useToast } from "@/hooks/use-toast";
import type { AccountCreatePayload } from "@/lib/account-create-payload";
import {
  buildCopySessionSignalRows,
  buildCopyGroupActivityFeed,
  buildCopyGroupRestartRecoveryItems,
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
  buildAccountRiskById,
  toAccountRiskBadgeView,
} from "@/lib/account-risk";
import {
  buildRithmicReadinessViewItems,
  getRithmicAccounts,
  type RithmicReadinessResponse,
} from "@/lib/rithmic-readiness";
import {
  type PositionSyncWorkflowSaveInput,
} from "@/lib/position-sync-workflow";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
  SESSION_STATUS_POLL_MS,
} from "@/lib/live-query-config";
import type { OperationsOverviewResponse } from "@/lib/operations-overview";
import type {
  DashboardRuntimeOverviewResponse,
} from "@/lib/runtime-overview";
import { type TradeHistoryDailySummary } from "@/lib/trade-history";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import {
  connectAccount,
  disconnectAccount,
  updateAccountConnectionInQueryData,
} from "@/lib/account-connection-api";
import {
  buildRithmicReadinessReviewPayload,
  type RithmicReadinessFollowUpItemView,
} from "@/lib/follow-up-operator";
import type { Account as AccountType } from "@shared/schema";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  Gauge,
  Layers3,
  RadioTower,
  ShieldCheck,
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
  hasLiveBalance: boolean;
  hasLivePositions: boolean;
};

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
  const [rithmicReadinessNotes, setRithmicReadinessNotes] = useState<Record<string, string>>({});
  const [isRecheckingAllRithmicReadiness, setIsRecheckingAllRithmicReadiness] = useState(false);

  const globalRiskSettings = {
    positionScaling: 100,
    maxContracts: undefined,
    blockedTickers: [] as string[],
  };

  const { data: accountsData } = useQuery<{ success: boolean; accounts: Account[] }>({
    queryKey: ["/api/accounts"],
  });
  const accounts = accountsData?.accounts || [];
  const rithmicAccounts = getRithmicAccounts(accounts);
  const hasConnectedAccounts = accounts.some((account) => account.isConnected);
  const hasRithmicAccounts = rithmicAccounts.length > 0;
  const usingMockData = false;
  const {
    loadDetailSections,
    showAccountRoster,
    setShowAccountRoster,
    showOpenPositions,
    setShowOpenPositions,
    showCopyGroupDetail,
    setShowCopyGroupDetail,
    showPositionSyncDetail,
    setShowPositionSyncDetail,
    selectedPositionSyncGroupId,
    setSelectedPositionSyncGroupId,
  } = useDashboardDetailPreferences({
    usingMockData,
  });
  const { data: authData } = useQuery<AuthMeResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: notificationsData } = useNotifications();
  const {
    rithmicReadinessReviewData,
    rithmicReadinessReviewsByStoryKey,
  } = useFollowUpReviewData(authData?.user?.id);
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
  const { data: rithmicReadinessData } = useQuery<RithmicReadinessResponse[] | null>({
    queryKey: authData?.user?.id
      ? ["/api/accounts/rithmic-readiness", authData.user.id, rithmicAccounts.map((account) => account.id).join(",")]
      : ["/api/accounts/rithmic-readiness", "anonymous"],
    queryFn: async () => {
      const responses = await Promise.all(
        rithmicAccounts.map(async (account) => {
          const res = await fetch(`/api/accounts/${account.id}/rithmic-readiness`, {
            credentials: "include",
          });

          if (!res.ok) {
            const text = (await res.text()) || res.statusText;
            throw new Error(`${res.status}: ${text}`);
          }

          return res.json() as Promise<RithmicReadinessResponse>;
        }),
      );

      return responses;
    },
    enabled: !!authData?.user?.id && hasRithmicAccounts,
    refetchInterval: LIVE_QUERY_POLL_MS,
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
  const dashboardSummary = runtimeOverviewData?.dashboardSummary ?? null;
  const accountBalanceMetricsById = buildAccountBalanceMetricsById(accountLiveMetricsData?.accounts ?? []);
  const accountRiskOverview = runtimeOverviewData?.accountRiskOverview;
  const accountRiskById = buildAccountRiskById(accountRiskOverview?.accounts ?? []);
  const positionMetricsById = buildAccountLiveMetricsById(positionSnapshotData?.accounts ?? []);
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
  const {
    riskFollowUpItems: sharedRiskFollowUpItems,
    executionFollowUpItems,
    visibleRithmicReadinessFollowUpItems,
    rithmicReadinessFollowUpSummary,
  } = useOperatorFollowUpData({
    notifications: notificationsData?.notifications ?? [],
    accountRiskAccounts: accountRiskOverview?.accounts ?? [],
    executionRecovery: runtimeOverviewData?.tradeAnalytics.executionRecovery,
    rithmicReadinessReviews: rithmicReadinessReviewData?.reviews ?? [],
  });
  const riskFollowUpItems = sharedRiskFollowUpItems.slice(0, 4);
  const rithmicReadinessFollowUpItems = visibleRithmicReadinessFollowUpItems.slice(0, 4);
  const {
    reviewedCount: reviewedRithmicReadinessCount,
    ownedCount: ownedRithmicReadinessCount,
    unownedCount: unownedRithmicReadinessCount,
    reassignedCount: reassignedRithmicReadinessCount,
  } = rithmicReadinessFollowUpSummary;
  const rithmicReadinessByAccountId = Object.fromEntries(
    buildRithmicReadinessViewItems(
      rithmicReadinessData?.map((response) => response.readiness) ?? [],
    ).map((item) => [item.accountId, item]),
  );

  const dashboardAccounts: DashboardAccountView[] = accounts.map((account) => {
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
              : 0,
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
          hasLiveBalance: liveBalanceMetrics?.hasLiveBrokerData ?? false,
          hasLivePositions: livePositionMetrics?.hasLiveBrokerData ?? false,
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
  const hasAnyLiveData = dashboardAccounts.some(
    (account) => account.hasLiveBalance || account.hasLivePositions,
  );
  const hasVerifiedLiveBalance = dashboardAccounts.length > 0
    && dashboardAccounts.every((account) => account.hasLiveBalance);
  const hasVerifiedLivePositions = dashboardAccounts.length > 0
    && dashboardAccounts.every((account) => account.hasLivePositions);
  const dashboardDataLabel = hasVerifiedLiveBalance && hasVerifiedLivePositions
    ? "Verified Broker Data"
    : hasAnyLiveData
      ? "Mixed Broker and Saved Data"
      : accounts.length > 0
        ? "Saved Account Data"
        : "No Account Data";

  const totalBuyingPower: number | null = null;
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
  const tradeLoggerStats = runtimeOverviewData?.tradeLogger ?? {
    pendingCount: 0,
    maxPendingCount: 0,
    totalQueued: 0,
    totalFlushed: 0,
    totalFlushes: 0,
    totalFailedFlushes: 0,
    lastSuccessfulBatchSize: undefined,
    lastFlushDurationMs: undefined,
    lastFlushedAt: undefined,
    lastErrorAt: undefined,
    lastErrorMessage: undefined,
    isFlushing: false,
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
  const {
    positionSyncWorkflowState,
    positionSyncPulse,
    positionSyncCards,
    positionSyncRepairBoardSummary,
    positionSyncRepairSummary,
    positionSyncRepairAttentionItems,
    positionSyncSummaryGroups,
    positionSyncPlanGroups,
    positionSyncReviewGroups,
  } = useDashboardPositionSyncData({
    userId: authData?.user?.id,
    enabled: !!authData?.user?.id && hasConnectedAccounts && loadDetailSections,
    selectedGroupId: selectedPositionSyncGroupId,
    showPositionSyncDetail,
    usingMockData,
    overview: positionSyncOverview,
    staleTime: LIVE_QUERY_STALE_MS,
    refetchInterval: hasConnectedAccounts ? LIVE_QUERY_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
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
  const copyGroupRuntimeSummariesByGroupId = Object.fromEntries(
    (copyGroupSnapshotData?.groups ?? []).map((group) => [
      group.group.group.groupId,
      group.runtimeSummary,
    ]),
  );
  const copyGroupActivityByGroupId = Object.fromEntries(
    (copyGroupSnapshotData?.groups ?? []).map((group) => [
      group.group.group.groupId,
      group.activityPreview,
    ]),
  );
  const copyGroupRestartRecoveryItems = buildCopyGroupRestartRecoveryItems({
    groups: hydratedCopyGroups,
    runtimeSummariesByGroupId: copyGroupRuntimeSummariesByGroupId,
    activityByGroupId: copyGroupActivityByGroupId,
    limit: 3,
  });
  const copyGroupFollowUpItems = hydratedCopyGroups
    .map((group, index) => ({
      groupId: group.groupId,
      groupName: group.name,
      runtimeSummary: copyGroupSnapshotData?.groups[index]?.runtimeSummary,
    }))
    .filter((group) => group.runtimeSummary)
    .filter((group) =>
      group.runtimeSummary?.tone === "danger" ||
      (group.runtimeSummary?.tone === "warn" &&
        group.runtimeSummary?.label !== "Restored offline"),
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
  const riskShield = breachedRiskCount > 0
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

  const {
    saveRithmicReadinessReviewsMutation,
    saveExecutionFollowUpReviewsMutation,
    recheckExecutionFollowUpItemMutation: recheckExecutionRecoveryItemMutation,
    recheckRithmicReadinessMutation,
  } = useFollowUpReviewActions({
    userId: authData?.user?.id,
  });
  const {
    savePositionSyncWorkflowMutation,
    simulatePositionSyncMutation,
  } = usePositionSyncWorkflowActions({
    userId: authData?.user?.id,
    onSuccess: (_result, reviews) => {
      const savedFollowerCount = reviews.length;
      const hasReviewedEntry = reviews.some((review) => review.status === "reviewed");
      if (hasReviewedEntry) {
        setPositionSyncReviewNotes((current) => {
          const next = { ...current };
          for (const review of reviews) {
            delete next[`${review.groupId}:${review.followerAccountId}`];
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
    onSimulationSuccess: (result) => {
      toast({
        title: "Sync Simulation Recorded",
        description: `${result.simulations.length} follower repair plan${result.simulations.length === 1 ? " was" : "s were"} validated and saved. No broker orders were submitted.`,
      });
    },
  });
  const {
    positionSyncReviewNotes,
    setPositionSyncReviewNotes,
    handlePositionSyncReview,
    handlePositionSyncSimulation,
    handleRepairCandidateTakeOwnership,
    handleRepairCandidateAdvance,
  } = useDashboardPositionSyncWorkflow({
    username: authData?.user?.username,
    positionSyncWorkflowState,
    positionSyncReviewGroups,
    savePositionSyncWorkflowMutation,
    simulatePositionSyncMutation,
  });
  const {
    reviewNotes,
    setReviewNotes,
    recheckExecutionRecoveryMutation,
    handleExecutionRecoveryRecheck,
    handleExecutionRecoveryItemRecheck,
    handleExecutionRecoveryItemReview,
    handleExecutionRecoveryItemTakeOwnership,
    handleExecutionRecoveryItemSaveNote,
    handleExecutionRecoveryItemReopen,
  } = useDashboardExecutionFollowUp({
    username: authData?.user?.username,
    refreshDashboardRuntimeOverview: refreshDashboardRuntimeOverviewQuery,
    saveExecutionFollowUpReviewsMutation,
    recheckExecutionRecoveryItemMutation: recheckExecutionRecoveryItemMutation,
    onRecheckSuccess: () => {
      toast({
        title: "Recovery State Rechecked",
        description: "Execution recovery was refreshed from the latest stored lifecycle activity.",
      });
    },
    onRecheckError: (error) => {
      toast({
        title: "Recovery Recheck Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
    onItemRecheckSuccess: (result) => {
      toast({
        title: "Execution Rechecked",
        description: result.recoveryItem
          ? `${result.recoveryItem.symbol} is still flagged as ${result.recoveryItem.headline.toLowerCase()}.`
          : "That execution is no longer showing as a recovery candidate.",
      });
    },
    onItemRecheckError: (error) => {
      toast({
        title: "Execution Recheck Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
    onReviewSuccess: () => {
      toast({
        title: "Execution Reviewed",
        description: "That recovery item is now marked as reviewed across your operator surfaces.",
      });
    },
    onReviewError: (error) => {
      toast({
        title: "Review Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleRithmicReadinessTakeOwnership = (item: RithmicReadinessFollowUpItemView) => {
    if (!authData?.user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(item.storyKey) ?? item.review;
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey: item.storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: authData.user.username,
        note: rithmicReadinessNotes[item.storyKey]?.trim() || currentReview?.note,
        status: currentReview?.status ?? "pending",
        assignmentReason: currentReview?.operatorName
          ? "Reassigned Rithmic readiness ownership"
          : "Claimed Rithmic readiness follow-up",
        reviewedAt: now,
      }),
    ]);
  };

  const handleRithmicReadinessSaveNote = (item: RithmicReadinessFollowUpItemView) => {
    if (!authData?.user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(item.storyKey) ?? item.review;
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey: item.storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? authData.user.username,
        note: rithmicReadinessNotes[item.storyKey]?.trim() || undefined,
        status: currentReview?.status ?? "pending",
      }),
    ]);
  };

  const handleRithmicReadinessReview = (item: RithmicReadinessFollowUpItemView) => {
    if (!authData?.user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(item.storyKey) ?? item.review;
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey: item.storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? authData.user.username,
        note: rithmicReadinessNotes[item.storyKey]?.trim() || currentReview?.note,
        status: "reviewed",
        assignmentReason: "Reviewed Rithmic readiness alert",
        reviewedAt: now,
      }),
    ]);
  };

  const handleRithmicReadinessReopen = (item: RithmicReadinessFollowUpItemView) => {
    if (!authData?.user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(item.storyKey) ?? item.review;
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey: item.storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? authData.user.username,
        note: rithmicReadinessNotes[item.storyKey]?.trim() || currentReview?.note,
        status: "pending",
        assignmentReason: "Reopened Rithmic readiness alert",
        reviewedAt: now,
      }),
    ]);
  };

  const handleRithmicReadinessRecheck = async (item: RithmicReadinessFollowUpItemView) => {
    try {
      const result = await recheckRithmicReadinessMutation.mutateAsync(item.accountId);
      toast({
        title: "Rithmic Readiness Rechecked",
        description: result.readiness.ready
          ? `${result.readiness.accountName} is ready after the latest saved-account check.`
          : `${result.readiness.accountName} refreshed. ${result.readiness.blockers[0] ?? "Reconnect proof still needs follow-up."}`,
      });
    } catch (error) {
      toast({
        title: "Rithmic Re-check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRithmicReadinessRecheckAll = async () => {
    if (rithmicReadinessFollowUpItems.length === 0) {
      return;
    }

    setIsRecheckingAllRithmicReadiness(true);

    let readyCount = 0;
    let blockedCount = 0;

    try {
      for (const item of rithmicReadinessFollowUpItems) {
        const result = await recheckRithmicReadinessMutation.mutateAsync(item.accountId);
        if (result.readiness.ready) {
          readyCount += 1;
        } else {
          blockedCount += 1;
        }
      }

      toast({
        title: "Rithmic Readiness Batch Rechecked",
        description: blockedCount === 0
          ? `${readyCount} saved Rithmic account${readyCount === 1 ? "" : "s"} refreshed and ready for the next restart check.`
          : `${readyCount} ready, ${blockedCount} still need follow-up after the latest saved-account refresh.`,
      });
    } catch (error) {
      toast({
        title: "Rithmic Batch Re-check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRecheckingAllRithmicReadiness(false);
    }
  };

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
  const positions = livePositions;

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[34px] border border-cyan-400/10 bg-[linear-gradient(145deg,_rgba(4,6,13,0.98),_rgba(7,10,18,0.98)_38%,_rgba(5,16,25,0.98)_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_85%_20%,rgba(74,222,128,0.1),transparent_22%),radial-gradient(circle_at_70%_100%,rgba(59,130,246,0.09),transparent_28%)]" />
        <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/10">
                {dashboardDataLabel}
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
                  label: hasVerifiedLiveBalance ? "Net Liquidity" : "Saved Balance",
                  value: formatCurrency(totalBalance),
                  icon: Wallet,
                  tone: "text-white",
                  status: hasVerifiedLiveBalance ? "broker live" : "not live",
                },
                {
                  label: "Buying Power",
                  value: totalBuyingPower === null ? "Unavailable" : formatCurrency(totalBuyingPower),
                  icon: CircleDollarSign,
                  tone: "text-cyan-300",
                  status: "not provided",
                },
                {
                  label: "Saved Daily P&L",
                  value: `${totalDailyPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalDailyPnl))}`,
                  icon: TrendingUp,
                  tone: getTone(totalDailyPnl),
                  status: "not live",
                },
                {
                  label: hasVerifiedLivePositions ? "Unrealized" : "Unrealized P&L",
                  value: `${totalUnrealizedPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalUnrealizedPnl))}`,
                  icon: Activity,
                  tone: getTone(totalUnrealizedPnl),
                  status: hasVerifiedLivePositions ? "broker live" : "unavailable",
                },
              ].map(({ label, value, icon: Icon, tone, status }) => (
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
                    <div className="mt-1 text-sm text-zinc-300">{status}</div>
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
              {tradeHistorySummary.total} recent lifecycle events
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Fill Rate</p>
              <p className="mt-2 text-xl font-semibold text-white">{filledRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Busiest Day</p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">
                {bestExecutionDay.label} ({bestExecutionDay.total})
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Most Failures</p>
              <p className="mt-2 text-xl font-semibold text-rose-300">
                {highestFailureDay.label} ({highestFailureDay.failed})
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Best Fill Day</p>
              <p className="mt-2 text-xl font-semibold text-cyan-300">
                {highestFilledDay.label} ({highestFilledDay.filled})
              </p>
            </div>
          </div>

          <div className="h-[360px] rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyExecutionSeries}>
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
                  dataKey="total"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="url(#equityGlow)"
                />
                <Line
                  type="monotone"
                  dataKey="filled"
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

              <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Trade Logger</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {tradeLoggerStats.totalFailedFlushes > 0
                        ? "Recent logger retries need review."
                        : tradeLoggerStats.isFlushing
                          ? "Lifecycle records are flushing now."
                          : tradeLoggerStats.pendingCount > 0
                            ? "Queued lifecycle records are waiting for the next flush."
                            : "Lifecycle logging is keeping up with the queue."}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {tradeLoggerStats.lastErrorMessage
                        ? tradeLoggerStats.lastErrorMessage
                        : tradeLoggerStats.lastSuccessfulBatchSize
                          ? `Last successful batch: ${tradeLoggerStats.lastSuccessfulBatchSize} records${tradeLoggerStats.lastFlushDurationMs !== undefined ? ` in ${tradeLoggerStats.lastFlushDurationMs} ms` : ""}.`
                          : "The runtime logger will show queue pressure and retry health here."}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      tradeLoggerStats.totalFailedFlushes > 0
                        ? "border-red-400/30 bg-red-400/10 text-red-200"
                        : tradeLoggerStats.isFlushing
                          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    }
                  >
                    {tradeLoggerStats.totalFailedFlushes > 0
                      ? "Retrying"
                      : tradeLoggerStats.isFlushing
                        ? "Flushing"
                        : "Clear"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Queued records", value: tradeLoggerStats.pendingCount },
                    { label: "Peak queue", value: tradeLoggerStats.maxPendingCount },
                    { label: "Failed flushes", value: tradeLoggerStats.totalFailedFlushes },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
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

              <DashboardExecutionFollowUpGrid
                authUsername={authData?.user?.username}
                executionFollowUpItems={executionFollowUpItems}
                executionRecovery={executionRecovery}
                reviewNotes={reviewNotes}
                setReviewNotes={setReviewNotes}
                isSavingReview={saveExecutionFollowUpReviewsMutation.isPending}
                isRecheckingItem={recheckExecutionRecoveryItemMutation.isPending}
                recheckingHistoryId={recheckExecutionRecoveryItemMutation.variables}
                onTakeOwnership={handleExecutionRecoveryItemTakeOwnership}
                onSaveNote={handleExecutionRecoveryItemSaveNote}
                onRecheck={handleExecutionRecoveryItemRecheck}
                onReview={handleExecutionRecoveryItemReview}
                onReopen={handleExecutionRecoveryItemReopen}
              />
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

        <section className="space-y-5">
          <DashboardSignalMatrixPanel
            matrixRows={matrixRows}
            riskFollowUpItems={riskFollowUpItems}
            usingMockData={usingMockData}
            followerHealthRows={followerHealthRows}
          />
          <DashboardRithmicReadinessPanel
            authUsername={authData?.user?.username}
            hasRithmicAccounts={hasRithmicAccounts}
            rithmicReadinessItems={rithmicReadinessFollowUpItems}
            readinessByAccountId={rithmicReadinessByAccountId}
            reviewedRithmicReadinessCount={reviewedRithmicReadinessCount}
            ownedRithmicReadinessCount={ownedRithmicReadinessCount}
            unownedRithmicReadinessCount={unownedRithmicReadinessCount}
            reassignedRithmicReadinessCount={reassignedRithmicReadinessCount}
            rithmicReadinessNotes={rithmicReadinessNotes}
            setRithmicReadinessNotes={setRithmicReadinessNotes}
            isSavingReview={saveRithmicReadinessReviewsMutation.isPending}
            isRecheckingAll={isRecheckingAllRithmicReadiness}
            isRecheckingItem={recheckRithmicReadinessMutation.isPending || isRecheckingAllRithmicReadiness}
            recheckingAccountId={recheckRithmicReadinessMutation.variables}
            onRecheckAll={handleRithmicReadinessRecheckAll}
            onTakeOwnership={handleRithmicReadinessTakeOwnership}
            onSaveNote={handleRithmicReadinessSaveNote}
            onRecheck={handleRithmicReadinessRecheck}
            onReview={handleRithmicReadinessReview}
            onReopen={handleRithmicReadinessReopen}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardAccountRosterPanel
          usingMockData={usingMockData}
          showAccountRoster={showAccountRoster}
          dashboardAccounts={dashboardAccounts}
          globalRiskSettings={globalRiskSettings}
          formatCurrency={formatCurrency}
          getBackgroundGlow={getBackgroundGlow}
          onToggleRoster={() => setShowAccountRoster((current) => !current)}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
          onConfigure={handleConfigure}
        />

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
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">P95 Dispatch</p>
                <p className={`mt-2 text-xl font-semibold ${
                  copyGroupOverview.dispatchLatencyStatus === "high"
                    ? "text-red-300"
                    : copyGroupOverview.dispatchLatencyStatus === "watch"
                      ? "text-amber-300"
                      : "text-cyan-300"
                }`}>
                  {copyGroupOverview.p95DispatchLatencyMs === null
                    ? "No data"
                    : `${copyGroupOverview.p95DispatchLatencyMs.toFixed(1)} ms`}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {copyGroupOverview.dispatchLatencySampleSize > 0
                    ? `${copyGroupOverview.dispatchLatencySampleSize} dispatch samples`
                    : "Waiting for copied trades"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Restart recoveries</p>
                <p className="mt-2 text-xl font-semibold text-emerald-300">
                  {copyGroupRestartRecoveryItems.length}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {copyGroupRestartRecoveryItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Restart Recovery</p>
                  <p className="text-xs text-zinc-400">
                    Groups restored into a safe offline state after recent reload recovery.
                  </p>
                  {copyGroupRestartRecoveryItems.map((item) => (
                    <div
                      key={item.groupId}
                      className={`rounded-2xl border p-3 ${
                        item.tone === "ok"
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-amber-500/20 bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.groupName}</p>
                          <p className="mt-1 text-xs text-zinc-300">{item.label}</p>
                        </div>
                        {item.updatedLabel && (
                          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            {item.updatedLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}

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

          <DashboardPositionSyncPanel
            usingMockData={usingMockData}
            positionSyncPulse={positionSyncPulse}
            positionSyncRepairSummary={positionSyncRepairSummary}
            positionSyncCards={positionSyncCards}
            positionSyncRepairBoardSummary={positionSyncRepairBoardSummary}
            positionSyncRepairAttentionItems={positionSyncRepairAttentionItems}
            showPositionSyncDetail={showPositionSyncDetail}
            onToggleDetail={() => setShowPositionSyncDetail((current) => !current)}
            positionSyncSummaryGroups={positionSyncSummaryGroups}
            positionSyncPlanGroups={positionSyncPlanGroups}
            positionSyncReviewGroups={positionSyncReviewGroups}
            selectedPositionSyncGroupId={selectedPositionSyncGroupId}
            onSelectGroup={setSelectedPositionSyncGroupId}
            positionSyncWorkflowState={positionSyncWorkflowState}
            positionSyncReviewNotes={positionSyncReviewNotes}
            onPositionSyncReviewNoteChange={(workflowKey, value) =>
              setPositionSyncReviewNotes((current) => ({
                ...current,
                [workflowKey]: value,
              }))
            }
            onPositionSyncSimulation={handlePositionSyncSimulation}
            onPositionSyncReview={handlePositionSyncReview}
            onRepairCandidateTakeOwnership={handleRepairCandidateTakeOwnership}
            onRepairCandidateAdvance={handleRepairCandidateAdvance}
          />
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
