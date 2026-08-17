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
  disabledFollowers: number;
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
    disabledFollowers: number;
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
  tradeLogger: {
    pendingCount: number;
    maxPendingCount: number;
    totalQueued: number;
    totalFlushed: number;
    totalFlushes: number;
    totalFailedFlushes: number;
    lastSuccessfulBatchSize?: number;
    lastFlushDurationMs?: number;
    lastFlushedAt?: string;
    lastErrorAt?: string;
    lastErrorMessage?: string;
    isFlushing: boolean;
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
        checkpoint?: ExecutionRecoveryFollowUpSignal;
        recoveryWindow?: ExecutionRecoveryFollowUpSignal;
        reviewStatus?: "pending" | "reviewed";
        reviewNote?: string;
        reviewedAt?: string;
        operatorName?: string;
        operatorHistory?: Array<{
          operatorName: string;
          assignedAt: string;
          reason?: string;
        }>;
      }>;
    };
  };
}

export interface ExecutionRecoveryFollowUpItem {
  historyId: string;
  symbol: string;
  followerAccountId: string;
  lifecycleStatus: TradeHistoryLifecycleStatus;
  category: "failed" | "stale" | "partial" | "active";
  severity: "error" | "warn" | "info";
  headline: string;
  detail: string;
  actionLabel: string;
  ageMinutes: number;
  checkpoint: ExecutionRecoveryFollowUpSignal;
  recoveryWindow: ExecutionRecoveryFollowUpSignal;
  reviewStatus?: "pending" | "reviewed";
  reviewNote?: string;
  reviewedAt?: string;
  operatorName?: string;
  operatorHistory?: Array<{
    operatorName: string;
    assignedAt: string;
    reason?: string;
  }>;
}

export interface ExecutionRecoveryFollowUpSignal {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

function buildExecutionRecoveryCheckpoint(item: {
  lifecycleStatus: TradeHistoryLifecycleStatus;
  category: ExecutionRecoveryFollowUpItem["category"];
}): ExecutionRecoveryFollowUpSignal {
  switch (item.lifecycleStatus) {
    case "FILLED":
      return {
        label: "Fill completed",
        detail: "The full quantity is complete and this item should clear from follow-up soon.",
        tone: "ok",
      };
    case "PARTIALLY_FILLED":
      return {
        label: "Partial fill active",
        detail: "At least one fill landed and the remaining quantity is still working.",
        tone: "warn",
      };
    case "ACKNOWLEDGED":
      return {
        label: "Broker acknowledged",
        detail:
          item.category === "stale"
            ? "The broker accepted the order, but follow-up is waiting on the next fill or lifecycle update."
            : "The broker accepted the order and the queue is waiting on fill updates.",
        tone: item.category === "active" ? "ok" : "warn",
      };
    case "SENT":
      return {
        label: "Waiting on acknowledgement",
        detail: "Submission left the local queue and is still waiting for a broker acknowledgement.",
        tone: "warn",
      };
    case "QUEUED":
      return {
        label: "Queued for routing",
        detail: "Execution is staged in the local pipeline before broker submission begins.",
        tone: "muted",
      };
    case "INTENT_CREATED":
      return {
        label: "Intent captured",
        detail: "The copy decision exists, but broker routing has not started yet.",
        tone: "muted",
      };
    case "RULE_SKIPPED":
      return {
        label: "Rule skipped routing",
        detail: "A copy rule stopped this order before it reached the broker.",
        tone: "warn",
      };
    case "RULE_REJECTED":
      return {
        label: "Rule rejected routing",
        detail: "A blocking rule rejected the order before broker submission could continue.",
        tone: "danger",
      };
    case "CANCELLED":
      return {
        label: "Execution cancelled",
        detail: "The order reached a cancelled state and needs operator context before retrying.",
        tone: "danger",
      };
    case "FAILED":
    default:
      return {
        label: "Execution failed",
        detail: "The broker or workflow returned a terminal failure state that needs follow-up.",
        tone: "danger",
      };
  }
}

function buildExecutionRecoveryWindow(input: {
  category: ExecutionRecoveryFollowUpItem["category"];
  ageMinutes: number;
  staleThresholdMinutes: number;
  reviewStatus?: ExecutionRecoveryFollowUpItem["reviewStatus"];
}): ExecutionRecoveryFollowUpSignal {
  const threshold = Math.max(input.staleThresholdMinutes, 1);
  const ageLabel =
    input.ageMinutes === 1 ? "1 minute" : `${input.ageMinutes} minutes`;

  if (input.category === "failed") {
    if (input.reviewStatus === "reviewed") {
      return {
        label: "Review captured",
        detail: "The failure note is already attached. Reopen only if the broker state changes.",
        tone: "ok",
      };
    }

    return {
      label: "Operator review open",
      detail: `Failure has been open for ${ageLabel}. Capture the follow-up note before the next retry decision.`,
      tone: "danger",
    };
  }

  if (input.category === "stale") {
    return {
      label: "Past stale window",
      detail: `No new lifecycle update has landed for ${ageLabel} (stale window ${threshold}m).`,
      tone: "danger",
    };
  }

  if (input.category === "partial") {
    if (input.ageMinutes >= threshold * 2) {
      return {
        label: "Aging partial fill",
        detail: `Remaining quantity has been open for ${ageLabel}. Recheck the broker before the next copy decision.`,
        tone: "danger",
      };
    }

    if (input.ageMinutes >= threshold) {
      return {
        label: "Monitor remaining quantity",
        detail: `Partial fill has been open for ${ageLabel}. Keep watching before the next copied trade.`,
        tone: "warn",
      };
    }

    return {
      label: "Fresh partial signal",
      detail: `Fill updates are still inside the ${threshold} minute watch window.`,
      tone: "ok",
    };
  }

  if (input.ageMinutes >= threshold) {
    return {
      label: "Approaching stale review",
      detail: `The latest lifecycle update is ${ageLabel} old. Recheck soon if nothing advances.`,
      tone: "warn",
    };
  }

  return {
    label: "Fresh lifecycle window",
    detail: `The latest lifecycle update is ${ageLabel} old and still inside the ${threshold} minute watch window.`,
    tone: "ok",
  };
}

export function buildExecutionRecoveryFollowUpQueue(
  executionRecovery?: DashboardRuntimeOverviewResponse["tradeAnalytics"]["executionRecovery"] | null,
): ExecutionRecoveryFollowUpItem[] {
  if (!executionRecovery) {
    return [];
  }

  const categoryPriority: Record<ExecutionRecoveryFollowUpItem["category"], number> = {
    failed: 0,
    stale: 1,
    partial: 2,
    active: 3,
  };

  return [...executionRecovery.items]
    .sort((left, right) => {
      const leftReviewed = left.reviewStatus === "reviewed" ? 1 : 0;
      const rightReviewed = right.reviewStatus === "reviewed" ? 1 : 0;
      if (leftReviewed !== rightReviewed) {
        return leftReviewed - rightReviewed;
      }

      const priorityDiff = categoryPriority[left.category] - categoryPriority[right.category];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.ageMinutes - left.ageMinutes;
    })
    .map((item) => ({
      historyId: item.historyId,
      symbol: item.symbol,
      followerAccountId: item.followerAccountId,
      lifecycleStatus: item.lifecycleStatus,
      category: item.category,
      severity:
        item.category === "failed"
          ? "error"
          : item.category === "stale" || item.category === "partial"
            ? "warn"
            : "info",
      headline: item.headline,
      detail: item.detail,
      actionLabel:
        item.category === "failed"
          ? "Capture the operator note, then mark the failure reviewed once follow-up is complete."
          : item.category === "stale"
            ? "Recheck the latest broker state before the next copy decision."
            : item.category === "partial"
              ? "Monitor remaining fills before sizing the next copied trade."
              : "Wait for the next lifecycle update or recheck if the state feels stuck.",
      ageMinutes: item.ageMinutes,
      checkpoint:
        item.checkpoint ??
        buildExecutionRecoveryCheckpoint({
          lifecycleStatus: item.lifecycleStatus,
          category: item.category,
        }),
      recoveryWindow:
        item.recoveryWindow ??
        buildExecutionRecoveryWindow({
          category: item.category,
          ageMinutes: item.ageMinutes,
          staleThresholdMinutes: executionRecovery.staleThresholdMinutes,
          reviewStatus: item.reviewStatus,
        }),
      reviewStatus: item.reviewStatus,
      reviewNote: item.reviewNote,
      reviewedAt: item.reviewedAt,
      operatorName: item.operatorName,
      operatorHistory: item.operatorHistory,
    }));
}
