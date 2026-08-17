import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import type { CopyGroupActivity } from "./copy-group-types";
import type { PositionSnapshotDependencies } from "./position-snapshot-service";
import type {
  AccountLiveMetricsDependencies,
  AccountLiveMetricsResult,
} from "./account-live-metrics-service";
import { buildAccountLiveMetrics } from "./account-live-metrics-service";
import { buildOperationsOverview, type OperationsOverviewResult } from "./operations-overview-service";
import { buildPositionSnapshots, type PositionSnapshotResult } from "./position-snapshot-service";
import {
  tradeHistoryStore,
  type TradeHistoryLifecycleStatus,
  type TradeHistoryRecord,
} from "./trade-history-store";
import {
  buildAccountRiskOverview,
  type AccountRiskOverviewResult,
} from "./account-risk-service";
import {
  buildPositionSyncOverview,
  type PositionSyncOverviewResult,
} from "./position-sync-overview-service";
import type { PersistedExecutionFollowUpReview } from "./execution-follow-up-review-store";
import {
  buildDashboardExecutionAttentionCards,
  buildDashboardExecutionPathRows,
  type DashboardExecutionAttentionCard,
  type DashboardExecutionPathRow,
} from "../client/src/lib/trade-history";
import { tradeLogger, type TradeLoggerStats } from "./trade-logger";

export interface DashboardTradeHistorySummary {
  total: number;
  filled: number;
  failed: number;
  pending: number;
  skippedOrRejected: number;
}

export interface DashboardTradeHistoryDailySummary {
  label: string;
  dateKey: string;
  total: number;
  filled: number;
  pending: number;
  failed: number;
}

export interface DashboardTradeAnalytics {
  summary: DashboardTradeHistorySummary;
  dailyExecutionSeries: DashboardTradeHistoryDailySummary[];
  attentionCards: DashboardExecutionAttentionCard[];
  recentPathRows: DashboardExecutionPathRow[];
  executionRecovery: DashboardExecutionRecoveryOverview;
}

export interface DashboardExecutionRecoveryOverview {
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
  items: DashboardExecutionRecoveryItem[];
}

export interface DashboardExecutionRecoverySignal {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface DashboardExecutionRecoveryItem {
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
  checkpoint: DashboardExecutionRecoverySignal;
  recoveryWindow: DashboardExecutionRecoverySignal;
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

function buildRecoveryActionCounts(
  items: DashboardExecutionRecoveryItem[],
): DashboardExecutionRecoveryOverview["actionCounts"] {
  const counts = new Map<
    DashboardExecutionRecoveryItem["recommendedAction"],
    { label: string; value: number }
  >();

  for (const item of items) {
    const current = counts.get(item.recommendedAction);
    if (current) {
      current.value += 1;
      continue;
    }

    counts.set(item.recommendedAction, {
      label: item.recommendedActionLabel,
      value: 1,
    });
  }

  const order = new Map<
    DashboardExecutionRecoveryItem["recommendedAction"],
    number
  >([
    ["review_failure", 0],
    ["recheck_broker", 1],
    ["monitor_fill", 2],
    ["wait_for_update", 3],
  ]);

  return Array.from(counts.entries())
    .map(([action, meta]) => ({
      action,
      label: meta.label,
      value: meta.value,
    }))
    .sort((left, right) => {
      const countDiff = right.value - left.value;
      if (countDiff !== 0) {
        return countDiff;
      }

      return (order.get(left.action) ?? 99) - (order.get(right.action) ?? 99);
    });
}

function formatRecoveryAgeLabel(ageMinutes: number): string {
  return ageMinutes === 1 ? "1 minute" : `${ageMinutes} minutes`;
}

function describeRecoveryAgeContext(record: TradeHistoryRecord): string {
  switch (record.lifecycleStatus) {
    case "PARTIALLY_FILLED":
      return "partial fill update";
    case "ACKNOWLEDGED":
      return "broker acknowledgement";
    case "SENT":
      return "broker submission";
    case "QUEUED":
      return "queue handoff";
    case "INTENT_CREATED":
      return "intent creation";
    case "FAILED":
    case "CANCELLED":
      return "failure event";
    case "RULE_REJECTED":
      return "rule rejection";
    case "RULE_SKIPPED":
      return "rule skip";
    default:
      return "latest lifecycle update";
  }
}

function buildPartialRecoveryDetail(record: TradeHistoryRecord): string {
  const filledQuantity = record.filledQuantity;
  const requestedQuantity = record.quantity;
  const remainingQuantity = record.remainingQuantity;
  const partialFillCount = record.partialFillCount;

  if (
    typeof filledQuantity === "number" &&
    typeof requestedQuantity === "number" &&
    typeof remainingQuantity === "number"
  ) {
    const countSuffix =
      typeof partialFillCount === "number" && partialFillCount > 0
        ? ` after ${partialFillCount} partial fill${partialFillCount === 1 ? "" : "s"}`
        : "";
    return `${filledQuantity}/${requestedQuantity} filled with ${remainingQuantity} contract${remainingQuantity === 1 ? "" : "s"} still open${countSuffix}.`;
  }

  if (typeof remainingQuantity === "number") {
    return `${remainingQuantity} contract${remainingQuantity === 1 ? "" : "s"} still open while fill updates continue.`;
  }

  return "Partial fills are still being processed.";
}

function buildExecutionRecoveryCheckpoint(
  record: TradeHistoryRecord,
  category: DashboardExecutionRecoveryItem["category"],
): DashboardExecutionRecoverySignal {
  switch (record.lifecycleStatus) {
    case "INTENT_CREATED":
      return {
        label: "Intent captured",
        detail: "The copy decision exists and is waiting to move into the execution queue.",
        tone: "muted",
      };
    case "QUEUED":
      return {
        label: "Queued for routing",
        detail: "Execution is staged in the local pipeline before broker submission begins.",
        tone: "muted",
      };
    case "SENT":
      return {
        label: "Submitted to broker",
        detail: record.brokerOrderId
          ? `Broker order ${record.brokerOrderId} is waiting for acknowledgement.`
          : "The order left the local queue and is waiting for broker acknowledgement.",
        tone: category === "active" ? "ok" : "warn",
      };
    case "ACKNOWLEDGED":
      return {
        label: "Broker acknowledged",
        detail: record.brokerOrderId
          ? `Broker order ${record.brokerOrderId} is waiting on fill updates.`
          : "The broker accepted the order and the queue is waiting on fills.",
        tone: category === "active" ? "ok" : "warn",
      };
    case "PARTIALLY_FILLED":
      return {
        label: "Partial fill active",
        detail: buildPartialRecoveryDetail(record),
        tone: "warn",
      };
    case "RULE_SKIPPED":
      return {
        label: "Rule skipped routing",
        detail:
          record.lastErrorMessage ??
          "A copy rule stopped this order before it reached the broker.",
        tone: "warn",
      };
    case "RULE_REJECTED":
      return {
        label: "Rule rejected routing",
        detail:
          record.lastErrorMessage ??
          "A blocking rule rejected this order before broker submission.",
        tone: "danger",
      };
    case "CANCELLED":
      return {
        label: "Execution cancelled",
        detail:
          record.lastErrorMessage ??
          "The order reached a cancelled state and needs operator context before retrying.",
        tone: "danger",
      };
    case "FAILED":
    default:
      return {
        label: "Execution failed",
        detail:
          record.lastErrorMessage ??
          "The broker or workflow returned a terminal failure state that needs follow-up.",
        tone: "danger",
      };
  }
}

function buildExecutionRecoveryWindow(input: {
  record: TradeHistoryRecord;
  category: DashboardExecutionRecoveryItem["category"];
  ageMinutes: number;
  staleThresholdMinutes: number;
  reviewStatus?: "pending" | "reviewed";
}): DashboardExecutionRecoverySignal {
  const ageLabel = formatRecoveryAgeLabel(input.ageMinutes);
  const ageContext = describeRecoveryAgeContext(input.record);

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
      detail: `${ageLabel} since the ${ageContext}. Capture the follow-up note before the next retry decision.`,
      tone: "danger",
    };
  }

  if (input.category === "stale") {
    const label =
      input.record.lifecycleStatus === "SENT"
        ? "Acknowledgement overdue"
        : input.record.lifecycleStatus === "ACKNOWLEDGED" ||
            input.record.lifecycleStatus === "PARTIALLY_FILLED"
          ? "Fill update overdue"
          : "Routing update overdue";

    return {
      label,
      detail: `${ageLabel} since ${ageContext} (stale window ${input.staleThresholdMinutes}m).`,
      tone: "danger",
    };
  }

  if (input.record.lifecycleStatus === "PARTIALLY_FILLED") {
    return {
      label: "Fresh partial window",
      detail: `${ageLabel} since the last partial fill update, still inside the ${input.staleThresholdMinutes} minute watch window.`,
      tone: "ok",
    };
  }

  if (input.record.lifecycleStatus === "ACKNOWLEDGED") {
    return {
      label: "Fresh fill window",
      detail: `${ageLabel} since broker acknowledgement, still inside the ${input.staleThresholdMinutes} minute watch window.`,
      tone: "ok",
    };
  }

  if (input.record.lifecycleStatus === "SENT") {
    return {
      label: "Fresh acknowledgement window",
      detail: `${ageLabel} since broker submission, still inside the ${input.staleThresholdMinutes} minute watch window.`,
      tone: "ok",
    };
  }

  return {
    label: "Fresh routing window",
    detail: `${ageLabel} since ${ageContext}. Routing is still inside the ${input.staleThresholdMinutes} minute watch window.`,
    tone: "muted",
  };
}

function buildExecutionRecoveryItem(
  record: TradeHistoryRecord,
  nowMs: number,
  staleThresholdMinutes: number,
  review?: PersistedExecutionFollowUpReview,
): DashboardExecutionRecoveryItem | null {
  if (record.lifecycleStatus === "FILLED") {
    return null;
  }

  const ageMinutes = Math.max(
    Math.floor((nowMs - new Date(pickTradeTimestamp(record)).getTime()) / 60_000),
    0,
  );

  if (record.recoveryRequired) {
    const reviewed = review?.status === "reviewed" || record.reviewStatus === "reviewed";
    return {
      historyId: record.historyId,
      symbol: record.symbol,
      followerAccountId: record.followerAccountId,
      lifecycleStatus: record.lifecycleStatus,
      category: "failed",
      recommendedAction: "review_failure",
      recommendedActionLabel: reviewed ? "Reviewed" : "Review restart state",
      ageMinutes,
      headline: reviewed ? "Restart state reviewed" : "Restart review required",
      detail: review?.note ?? record.reviewNote ?? record.recoveryReason ?? "Confirm broker state before taking any action.",
      checkpoint: buildExecutionRecoveryCheckpoint(record, "failed"),
      recoveryWindow: {
        label: reviewed ? "Operator reviewed" : "Automatic replay blocked",
        detail: reviewed
          ? "The interrupted lifecycle has been reviewed."
          : "PropCopia did not resubmit this order after restart. Verify the broker state manually.",
        tone: reviewed ? "ok" : "danger",
      },
      reviewStatus: reviewed ? "reviewed" : record.reviewStatus,
      reviewNote: review?.note ?? record.reviewNote,
      reviewedAt: review?.reviewedAt ?? record.reviewedAt,
      operatorName: review?.operatorName,
      operatorHistory: review?.operatorHistory,
    };
  }

  if (FAILED_TRADE_STATUSES.has(record.lifecycleStatus)) {
    const reviewed = review?.status === "reviewed" || record.reviewStatus === "reviewed";
    const reviewNote = review?.note ?? record.reviewNote;
    const reviewedAt = review?.reviewedAt ?? record.reviewedAt;
    return {
      historyId: record.historyId,
      symbol: record.symbol,
      followerAccountId: record.followerAccountId,
      lifecycleStatus: record.lifecycleStatus,
      category: "failed",
      recommendedAction: "review_failure",
      recommendedActionLabel: reviewed ? "Reviewed" : "Review failure",
      ageMinutes,
      headline: reviewed ? "Reviewed failure" : "Needs review",
      detail:
        reviewed && reviewNote
          ? `Reviewed note: ${reviewNote}`
          : record.lastErrorMessage ?? "Execution stopped before completion.",
      checkpoint: buildExecutionRecoveryCheckpoint(record, "failed"),
      recoveryWindow: buildExecutionRecoveryWindow({
        record,
        category: "failed",
        ageMinutes,
        staleThresholdMinutes,
        reviewStatus: reviewed ? "reviewed" : record.reviewStatus,
      }),
      reviewStatus: reviewed ? "reviewed" : record.reviewStatus,
      reviewNote,
      reviewedAt,
      operatorName: review?.operatorName,
      operatorHistory: review?.operatorHistory,
    };
  }

  if (!ACTIVE_TRADE_STATUSES.has(record.lifecycleStatus)) {
    return null;
  }

  if (ageMinutes >= staleThresholdMinutes) {
    return {
      historyId: record.historyId,
      symbol: record.symbol,
      followerAccountId: record.followerAccountId,
      lifecycleStatus: record.lifecycleStatus,
      category: "stale",
      recommendedAction: "recheck_broker",
      recommendedActionLabel: "Recheck broker state",
      ageMinutes,
      headline: "Possibly stalled",
      detail: `No new lifecycle update for ${ageMinutes} minute${ageMinutes === 1 ? "" : "s"}.`,
      checkpoint: buildExecutionRecoveryCheckpoint(record, "stale"),
      recoveryWindow: buildExecutionRecoveryWindow({
        record,
        category: "stale",
        ageMinutes,
        staleThresholdMinutes,
        reviewStatus: review?.status ?? record.reviewStatus,
      }),
      reviewStatus: review?.status ?? record.reviewStatus,
      reviewNote: review?.note ?? record.reviewNote,
      reviewedAt: review?.reviewedAt ?? record.reviewedAt,
      operatorName: review?.operatorName,
      operatorHistory: review?.operatorHistory,
    };
  }

  if (record.lifecycleStatus === "PARTIALLY_FILLED") {
    const filledQuantity = record.filledQuantity ?? 0;
    const remainingQuantity = record.remainingQuantity ?? 0;
    return {
      historyId: record.historyId,
      symbol: record.symbol,
      followerAccountId: record.followerAccountId,
      lifecycleStatus: record.lifecycleStatus,
      category: "partial",
      recommendedAction: "monitor_fill",
      recommendedActionLabel: "Monitor fill progress",
      ageMinutes,
      headline: "Waiting on remaining fills",
      detail:
        remainingQuantity > 0
          ? `${filledQuantity} filled, ${remainingQuantity} still open.`
          : "Partial fills are still being processed.",
      checkpoint: buildExecutionRecoveryCheckpoint(record, "partial"),
      recoveryWindow: buildExecutionRecoveryWindow({
        record,
        category: "partial",
        ageMinutes,
        staleThresholdMinutes,
        reviewStatus: review?.status ?? record.reviewStatus,
      }),
      reviewStatus: review?.status ?? record.reviewStatus,
      reviewNote: review?.note ?? record.reviewNote,
      reviewedAt: review?.reviewedAt ?? record.reviewedAt,
      operatorName: review?.operatorName,
      operatorHistory: review?.operatorHistory,
    };
  }

  return {
    historyId: record.historyId,
    symbol: record.symbol,
    followerAccountId: record.followerAccountId,
    lifecycleStatus: record.lifecycleStatus,
    category: "active",
    recommendedAction: "wait_for_update",
    recommendedActionLabel: "Wait for next update",
    ageMinutes,
    headline: "Still in flight",
    detail: `Last lifecycle update ${ageMinutes} minute${ageMinutes === 1 ? "" : "s"} ago.`,
    checkpoint: buildExecutionRecoveryCheckpoint(record, "active"),
    recoveryWindow: buildExecutionRecoveryWindow({
      record,
      category: "active",
      ageMinutes,
      staleThresholdMinutes,
      reviewStatus: review?.status ?? record.reviewStatus,
    }),
    reviewStatus: review?.status ?? record.reviewStatus,
    reviewNote: review?.note ?? record.reviewNote,
    reviewedAt: review?.reviewedAt ?? record.reviewedAt,
    operatorName: review?.operatorName,
    operatorHistory: review?.operatorHistory,
  };
}

export interface CopyGroupRuntimeOverviewItem {
  group: RegisteredCopyGroup;
  runtime?: {
    state: unknown;
  };
  runtimeSummary?: {
    label: string;
    detail: string;
    tone: "ok" | "warn" | "danger" | "muted";
    updatedLabel?: string;
  };
  activityPreview: CopyGroupActivity[];
}

export interface CopyGroupRuntimeOverview {
  groups: CopyGroupRuntimeOverviewItem[];
  runningGroups: string[];
}

export interface AccountsRuntimeOverviewResult {
  generatedAt: string;
  positionSnapshot: PositionSnapshotResult;
  accountLiveMetrics: AccountLiveMetricsResult;
  accountRiskOverview: AccountRiskOverviewResult;
  positionSyncOverview: PositionSyncOverviewResult;
}

export interface DashboardRuntimeOverviewResult extends AccountsRuntimeOverviewResult {
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
  tradeLogger: TradeLoggerStats;
  copyGroups: CopyGroupRuntimeOverview;
  operationsOverview: OperationsOverviewResult;
  tradeAnalytics: DashboardTradeAnalytics;
  positionSyncOverview: PositionSyncOverviewResult;
}

interface BuildAccountsRuntimeOverviewInput {
  userAccounts: Account[];
  registeredGroups?: RegisteredCopyGroup[];
  positionSnapshotDependencies: PositionSnapshotDependencies;
  accountLiveMetricsDependencies: AccountLiveMetricsDependencies;
}

interface BuildDashboardRuntimeOverviewInput extends BuildAccountsRuntimeOverviewInput {
  registeredGroups: RegisteredCopyGroup[];
  getRunningGroups: () => Array<{ group: { groupId: string; userId: string } }>;
  getRuntime: (groupId: string) => {
    state: unknown;
    statistics: unknown;
    health: unknown;
  } | undefined;
  getRecentActivity: (groupId: string) => CopyGroupActivity[];
  executionFollowUpReviews?: PersistedExecutionFollowUpReview[];
}

const FAILED_TRADE_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);
const ACTIVE_TRADE_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "INTENT_CREATED",
  "QUEUED",
  "SENT",
  "ACKNOWLEDGED",
  "PARTIALLY_FILLED",
]);
const DEFAULT_STALE_THRESHOLD_MINUTES = 5;

function formatCopyGroupRuntimeUpdatedLabel(timestamp?: string): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildCopyGroupRuntimeSummary(input: {
  status: string;
  connectedFollowerCount: number;
  totalFollowerCount: number;
  lastActivityMessage?: string;
  lastUpdatedAt?: string;
  emergencyStopReason?: string;
  healthStatus?: string;
}): CopyGroupRuntimeOverviewItem["runtimeSummary"] {
  const followerReadiness = input.totalFollowerCount > 0
    ? `${input.connectedFollowerCount}/${input.totalFollowerCount} followers ready.`
    : "No followers assigned yet.";
  const updatedLabel = formatCopyGroupRuntimeUpdatedLabel(input.lastUpdatedAt);
  const restoredOfflineAfterReload =
    input.status === "STOPPED" &&
    !!input.lastActivityMessage &&
    (input.lastActivityMessage.startsWith("Recovered copy group ") ||
      input.lastActivityMessage.startsWith("Restored "));

  if (input.status === "EMERGENCY_STOPPED") {
    return {
      label: "Emergency stop active",
      detail:
        input.emergencyStopReason ??
        input.lastActivityMessage ??
        "This group stays locked until you clear the stop.",
      tone: "danger",
      updatedLabel,
    };
  }

  if (input.status === "PAUSED") {
    return {
      label: "Paused safely",
      detail:
        input.lastActivityMessage ??
        "This group will stay offline until you resume it.",
      tone: "warn",
      updatedLabel,
    };
  }

  if (input.status === "RUNNING") {
    if (input.healthStatus === "UNHEALTHY") {
      return {
        label: "Running with active issues",
        detail: input.lastActivityMessage ?? followerReadiness,
        tone: "danger",
        updatedLabel,
      };
    }

    if (input.healthStatus === "DEGRADED") {
      return {
        label: "Running on watch",
        detail: input.lastActivityMessage ?? followerReadiness,
        tone: "warn",
        updatedLabel,
      };
    }

    return {
      label: "Running cleanly",
      detail: input.lastActivityMessage ?? followerReadiness,
      tone: "ok",
      updatedLabel,
    };
  }

  if (input.status === "STARTING" || input.status === "STOPPING") {
    return {
      label: "Updating state",
      detail: input.lastActivityMessage ?? "Waiting for the latest runtime snapshot.",
      tone: "warn",
      updatedLabel,
    };
  }

  if (input.status === "ERROR") {
    return {
      label: "Needs review",
      detail: input.lastActivityMessage ?? "The group reported an error and should be checked before reuse.",
      tone: "danger",
      updatedLabel,
    };
  }

  if (restoredOfflineAfterReload) {
    return {
      label: "Restored offline",
      detail: input.lastActivityMessage ?? "This group was restored into a safe offline state after reload.",
      tone: "warn",
      updatedLabel,
    };
  }

  return {
    label: "Ready to start",
    detail: input.lastActivityMessage ?? `Configuration saved. ${followerReadiness}`,
    tone: "muted",
    updatedLabel,
  };
}

function pickTradeTimestamp(record: TradeHistoryRecord): string {
  switch (record.lifecycleStatus) {
    case "FILLED":
      return record.filledAt ?? record.updatedAt ?? record.acknowledgedAt ?? record.sentAt ?? record.createdAt;
    case "PARTIALLY_FILLED":
      return record.updatedAt ?? record.acknowledgedAt ?? record.sentAt ?? record.queuedAt ?? record.createdAt;
    case "ACKNOWLEDGED":
      return record.acknowledgedAt ?? record.sentAt ?? record.queuedAt ?? record.updatedAt ?? record.createdAt;
    case "SENT":
      return record.sentAt ?? record.queuedAt ?? record.updatedAt ?? record.createdAt;
    case "FAILED":
    case "CANCELLED":
      return record.failedAt ?? record.updatedAt ?? record.sentAt ?? record.createdAt;
    case "QUEUED":
      return record.queuedAt ?? record.updatedAt ?? record.createdAt;
    case "INTENT_CREATED":
      return record.updatedAt ?? record.createdAt;
    default:
      return record.updatedAt ?? record.createdAt;
  }
}

function summarizeTradeRecords(records: TradeHistoryRecord[]): DashboardTradeHistorySummary {
  return records.reduce<DashboardTradeHistorySummary>(
    (summary, record) => {
      summary.total += 1;

      if (record.lifecycleStatus === "FILLED") {
        summary.filled += 1;
      } else if (
        record.lifecycleStatus === "RULE_SKIPPED" ||
        record.lifecycleStatus === "RULE_REJECTED"
      ) {
        summary.skippedOrRejected += 1;
      } else if (FAILED_TRADE_STATUSES.has(record.lifecycleStatus)) {
        summary.failed += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    {
      total: 0,
      filled: 0,
      failed: 0,
      pending: 0,
      skippedOrRejected: 0,
    },
  );
}

function summarizeTradeRecordsByDay(
  records: TradeHistoryRecord[],
  days = 5,
): DashboardTradeHistoryDailySummary[] {
  const normalizedDays = Math.max(1, Math.floor(days));
  const byDay = new Map<string, DashboardTradeHistoryDailySummary>();

  for (let index = normalizedDays - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    const dateKey = date.toISOString().slice(0, 10);
    byDay.set(dateKey, {
      dateKey,
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      total: 0,
      filled: 0,
      pending: 0,
      failed: 0,
    });
  }

  for (const record of records) {
    const dateKey = new Date(pickTradeTimestamp(record)).toISOString().slice(0, 10);
    const day = byDay.get(dateKey);

    if (!day) {
      continue;
    }

    day.total += 1;

    if (record.lifecycleStatus === "FILLED") {
      day.filled += 1;
    } else if (FAILED_TRADE_STATUSES.has(record.lifecycleStatus)) {
      day.failed += 1;
    } else {
      day.pending += 1;
    }
  }

  return Array.from(byDay.values());
}

export function summarizeExecutionRecovery(
  records: TradeHistoryRecord[],
  options: {
    now?: string;
    staleThresholdMinutes?: number;
    limit?: number;
    executionFollowUpReviews?: PersistedExecutionFollowUpReview[];
  } = {},
): DashboardExecutionRecoveryOverview {
  const staleThresholdMinutes = Math.max(
    1,
    Math.floor(options.staleThresholdMinutes ?? DEFAULT_STALE_THRESHOLD_MINUTES),
  );
  const limit = Math.max(1, Math.floor(options.limit ?? 4));
  const nowMs = new Date(options.now ?? new Date().toISOString()).getTime();
  const staleThresholdMs = staleThresholdMinutes * 60_000;
  const reviewsByHistoryId = new Map(
    (options.executionFollowUpReviews ?? []).map((review) => [review.historyId, review]),
  );

  const counts = records.reduce(
    (summary, record) => {
      if (record.lifecycleStatus === "FILLED") {
        summary.completed += 1;
        return summary;
      }

      if (FAILED_TRADE_STATUSES.has(record.lifecycleStatus)) {
        summary.failed += 1;
        return summary;
      }

      if (record.recoveryRequired) {
        summary.failed += 1;
        return summary;
      }

      if (!ACTIVE_TRADE_STATUSES.has(record.lifecycleStatus)) {
        return summary;
      }

      const ageMs = Math.max(nowMs - new Date(pickTradeTimestamp(record)).getTime(), 0);
      const isStale = ageMs >= staleThresholdMs;

      if (isStale) {
        summary.stale += 1;
        return summary;
      }

      if (record.lifecycleStatus === "PARTIALLY_FILLED") {
        summary.partial += 1;
        return summary;
      }

      summary.active += 1;
      return summary;
    },
    {
      failed: 0,
      stale: 0,
      partial: 0,
      active: 0,
      completed: 0,
    },
  );
  const priority = new Map<DashboardExecutionRecoveryItem["category"], number>([
    ["failed", 0],
    ["stale", 1],
    ["partial", 2],
    ["active", 3],
  ]);
  const items: DashboardExecutionRecoveryItem[] = records
    .map((record) =>
      buildExecutionRecoveryItem(
        record,
        nowMs,
        staleThresholdMinutes,
        reviewsByHistoryId.get(record.historyId),
      ),
    )
    .filter((item): item is DashboardExecutionRecoveryItem => item !== null)
    .sort((left, right) => {
      const priorityDiff = (priority.get(left.category) ?? 99) - (priority.get(right.category) ?? 99);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return right.ageMinutes - left.ageMinutes;
    })
    .slice(0, limit);
  const actionCounts = buildRecoveryActionCounts(items);
  const primaryActionLabel =
    actionCounts[0]?.label ??
    (counts.completed > 0 ? "No recovery action needed" : "Waiting for recovery candidates");

  if (counts.failed > 0) {
    return {
      headline: `${counts.failed} execution${counts.failed === 1 ? "" : "s"} need review`,
      detail:
        counts.stale > 0
          ? `${counts.stale} more execution${counts.stale === 1 ? " looks" : "s look"} stalled.`
          : "Failed executions should be reviewed before reconnect recovery.",
      tone: "danger",
      staleThresholdMinutes,
      primaryActionLabel,
      counts,
      actionCounts,
      items,
    };
  }

  if (counts.stale > 0) {
    return {
      headline: `${counts.stale} execution${counts.stale === 1 ? "" : "s"} may be stalled`,
      detail: `These orders have been in-flight for more than ${staleThresholdMinutes} minutes.`,
      tone: "warn",
      staleThresholdMinutes,
      primaryActionLabel,
      counts,
      actionCounts,
      items,
    };
  }

  if (counts.partial > 0) {
    return {
      headline: `${counts.partial} execution${counts.partial === 1 ? "" : "s"} still need fills`,
      detail: "Partial fills are being tracked and still have quantity remaining.",
      tone: "warn",
      staleThresholdMinutes,
      primaryActionLabel,
      counts,
      actionCounts,
      items,
    };
  }

  if (counts.active > 0) {
    return {
      headline: `${counts.active} execution${counts.active === 1 ? "" : "s"} currently in flight`,
      detail: "Orders are still moving through the queue or broker acknowledgement steps.",
      tone: "ok",
      staleThresholdMinutes,
      primaryActionLabel,
      counts,
      actionCounts,
      items,
    };
  }

  return {
    headline:
      counts.completed > 0
        ? `${counts.completed} recent execution${counts.completed === 1 ? "" : "s"} cleared`
        : "No recent executions",
    detail:
      counts.completed > 0
        ? "Recent execution flow is clear with no active recovery work."
        : "Execution recovery will appear here once recent order activity is available.",
    tone: counts.completed > 0 ? "ok" : "muted",
    staleThresholdMinutes,
    primaryActionLabel,
    counts,
    actionCounts,
    items,
  };
}

export async function buildAccountsRuntimeOverview(
  input: BuildAccountsRuntimeOverviewInput,
): Promise<AccountsRuntimeOverviewResult> {
  const [positionSnapshot, accountLiveMetrics] = await Promise.all([
    buildPositionSnapshots(input.userAccounts, input.positionSnapshotDependencies),
    buildAccountLiveMetrics(input.userAccounts, input.accountLiveMetricsDependencies),
  ]);
  const accountRiskOverview = buildAccountRiskOverview({
    accounts: input.userAccounts,
    liveAccounts: accountLiveMetrics.accounts,
    positionSnapshots: positionSnapshot.accounts,
  });
  const positionSyncOverview = buildPositionSyncOverview({
    userAccounts: input.userAccounts,
    registeredGroups: input.registeredGroups ?? [],
    positionSnapshot,
  });

  return {
    generatedAt: new Date().toISOString(),
    positionSnapshot,
    accountLiveMetrics,
    accountRiskOverview,
    positionSyncOverview,
  };
}

export async function buildDashboardRuntimeOverview(
  input: BuildDashboardRuntimeOverviewInput,
): Promise<DashboardRuntimeOverviewResult> {
  const [accountsOverview, operationsOverview] = await Promise.all([
    buildAccountsRuntimeOverview(input),
    buildOperationsOverview({
      userAccounts: input.userAccounts,
      registeredGroups: input.registeredGroups,
      getRuntime: input.getRuntime as BuildDashboardRuntimeOverviewInput["getRuntime"] & ((groupId: string) => {
        state: {
          status: string;
          connectedFollowerCount: number;
          totalFollowerCount: number;
        };
        health: {
          status: string;
        };
      } | undefined),
      getRecentActivity: input.getRecentActivity,
      positionSnapshotDependencies: input.positionSnapshotDependencies,
    }),
  ]);
  const accountIds = input.userAccounts.map((account) => account.id);
  const recentTrades = tradeHistoryStore.listRecent({
    accountIds,
    limit: 250,
  });
  const tradeAnalytics: DashboardTradeAnalytics = {
    summary: summarizeTradeRecords(recentTrades),
    dailyExecutionSeries: summarizeTradeRecordsByDay(recentTrades, 5),
    attentionCards: buildDashboardExecutionAttentionCards(recentTrades.slice(0, 4)),
    recentPathRows: buildDashboardExecutionPathRows(recentTrades.slice(0, 4), 3),
    executionRecovery: summarizeExecutionRecovery(recentTrades, {
      executionFollowUpReviews: input.executionFollowUpReviews,
    }),
  };
  const totalBalance = input.userAccounts.reduce((sum, account) => {
    const liveAccount = accountsOverview.accountLiveMetrics.accounts.find(
      (snapshot) => snapshot.accountId === account.id,
    );

    if (liveAccount?.status === "LIVE" && typeof liveAccount.balance === "number") {
      return sum + liveAccount.balance;
    }

    return sum + (account.balance ? Number(account.balance) : 0);
  }, 0);
  const totalDailyPnl = input.userAccounts.reduce(
    (sum, account) => sum + (account.pnl ? Number(account.pnl) : 0),
    0,
  );
  const totalUnrealizedPnl = accountsOverview.positionSnapshot.accounts.reduce(
    (sum, account) =>
      sum + account.positions.reduce((positionSum, position) => positionSum + (position.unrealizedPnl ?? 0), 0),
    0,
  );
  const dashboardSummary = {
    totalAccounts: input.userAccounts.length,
    connectedAccounts: input.userAccounts.filter((account) => account.isConnected).length,
    disconnectedAccounts: input.userAccounts.filter((account) => !account.isConnected).length,
    totalBalance,
    totalBuyingPower: totalBalance * 1.92,
    totalDailyPnl,
    totalUnrealizedPnl,
    totalOpenPositions: accountsOverview.positionSnapshot.summary.totalOpenPositions,
  };

  const copyGroups: CopyGroupRuntimeOverview = {
    groups: input.registeredGroups.map((registeredGroup) => {
      const runtime = input.getRuntime(registeredGroup.group.groupId);
      const recentActivity = runtime ? input.getRecentActivity(registeredGroup.group.groupId) : [];
      const latestActivity = recentActivity[0];

      return {
        group: registeredGroup,
        runtime: runtime
          ? {
            state: runtime.state,
          }
          : undefined,
        runtimeSummary: buildCopyGroupRuntimeSummary({
          status: (runtime?.state as { status?: string } | undefined)?.status ?? "STOPPED",
          connectedFollowerCount:
            (runtime?.state as { connectedFollowerCount?: number } | undefined)?.connectedFollowerCount ?? 0,
          totalFollowerCount:
            (runtime?.state as { totalFollowerCount?: number } | undefined)?.totalFollowerCount ??
            registeredGroup.group.followerAccountIds.length,
          lastActivityMessage: latestActivity?.message,
          lastUpdatedAt:
            latestActivity?.timestamp ??
            (runtime?.statistics as { lastUpdatedAt?: string } | undefined)?.lastUpdatedAt ??
            (runtime?.health as { checkedAt?: string } | undefined)?.checkedAt,
          emergencyStopReason:
            (runtime?.state as { emergencyStopReason?: string } | undefined)?.emergencyStopReason,
          healthStatus: (runtime?.health as { status?: string } | undefined)?.status,
        }),
        activityPreview: recentActivity.slice(0, 3),
      };
    }),
    runningGroups: input
      .getRunningGroups()
      .filter((runtime) => runtime.group.userId === input.userAccounts[0]?.userId)
      .map((runtime) => runtime.group.groupId),
  };
  return {
    ...accountsOverview,
    dashboardSummary,
    tradeLogger: tradeLogger.getStats(),
    copyGroups,
    operationsOverview,
    tradeAnalytics,
  };
}
