import type { AccountLiveMetricsResponse } from "./account-live-metrics";
import type { AccountRiskOverviewResponse } from "./account-risk";
import type { CopyGroupSnapshotApiResponse } from "./copy-groups";
import type { OperationsOverviewResponse } from "./operations-overview";
import type { PositionSnapshotResponse } from "./positions";
import type {
  DashboardExecutionAttentionCard,
  DashboardExecutionPathRow,
  TradeHistoryDailySummary,
  TradeHistoryLifecycleStatus,
  TradeHistorySummary,
} from "./trade-history";

export interface PositionSyncFollowerOverviewItem {
  followerAccountId: string;
  followerName: string;
  status: "IN_SYNC" | "OUT_OF_SYNC" | "UNAVAILABLE" | "DISABLED";
  summary: string;
  adjustmentCount: number;
  adjustments: Array<{
    symbol: string;
    currentQuantity: number;
    targetQuantity: number;
    deltaQuantity: number;
    action: "BUY" | "SELL" | "FLATTEN";
    reason: "OPEN" | "INCREASE" | "REDUCE" | "REVERSE" | "FLATTEN_EXTRA";
  }>;
}

export interface PositionSyncGroupOverviewItem {
  groupId: string;
  groupName: string;
  masterAccountId: string;
  masterAccountName: string;
  status: "IN_SYNC" | "OUT_OF_SYNC" | "UNAVAILABLE";
  summary: string;
  followerCount: number;
  outOfSyncFollowers: number;
  unavailableFollowers: number;
  followers: PositionSyncFollowerOverviewItem[];
}

export interface PositionSyncOverviewResponse {
  generatedAt: string;
  summary: {
    totalGroups: number;
    inSyncGroups: number;
    outOfSyncGroups: number;
    unavailableGroups: number;
    outOfSyncFollowers: number;
    unavailableFollowers: number;
  };
  groups: PositionSyncGroupOverviewItem[];
}

export interface AccountsRuntimeOverviewResponse {
  success: boolean;
  generatedAt: string;
  positionSnapshot: PositionSnapshotResponse;
  accountLiveMetrics: AccountLiveMetricsResponse;
  accountRiskOverview: AccountRiskOverviewResponse;
  positionSyncOverview?: PositionSyncOverviewResponse;
}

export interface DashboardRuntimeOverviewResponse {
  success: boolean;
  generatedAt: string;
  accountRiskOverview: AccountRiskOverviewResponse;
  positionSyncOverview?: PositionSyncOverviewResponse;
  dashboardSummary: {
    totalAccounts: number;
    connectedAccounts: number;
    disconnectedAccounts: number;
    totalBalance: number;
    totalBuyingPower: number;
    totalDailyPnl: number;
    totalUnrealizedPnl: number;
    totalOpenPositions: number;
  };
  copyGroups: CopyGroupSnapshotApiResponse;
  operationsOverview: OperationsOverviewResponse;
  tradeAnalytics: {
    summary: TradeHistorySummary;
    dailyExecutionSeries: TradeHistoryDailySummary[];
    attentionCards: DashboardExecutionAttentionCard[];
    recentPathRows: DashboardExecutionPathRow[];
    executionRecovery: {
      headline: string;
      detail: string;
      tone: "ok" | "warn" | "danger" | "muted";
      staleThresholdMinutes: number;
      primaryActionLabel: string;
      counts: {
        failed: number;
        stale: number;
        partial: number;
        active: number;
        completed: number;
      };
      actionCounts: Array<{
        action:
          | "review_failure"
          | "recheck_broker"
          | "monitor_fill"
          | "wait_for_update";
        label: string;
        value: number;
      }>;
      items: Array<{
        historyId: string;
        symbol: string;
        followerAccountId: string;
        lifecycleStatus: TradeHistoryLifecycleStatus;
        category: "failed" | "stale" | "partial" | "active";
        recommendedAction:
          | "review_failure"
          | "recheck_broker"
          | "monitor_fill"
          | "wait_for_update";
        recommendedActionLabel: string;
        ageMinutes: number;
        headline: string;
        detail: string;
        reviewStatus?: "pending" | "reviewed";
        reviewNote?: string;
        reviewedAt?: string;
      }>;
    };
  };
}
