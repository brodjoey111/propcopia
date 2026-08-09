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
}

export interface CopyGroupRuntimeOverviewItem {
  group: RegisteredCopyGroup;
  runtime?: {
    state: unknown;
    statistics: unknown;
    health: unknown;
  };
  activity: CopyGroupActivity[];
}

export interface CopyGroupRuntimeOverview {
  groups: CopyGroupRuntimeOverviewItem[];
  runningGroups: string[];
}

export interface AccountsRuntimeOverviewResult {
  generatedAt: string;
  positionSnapshot: PositionSnapshotResult;
  accountLiveMetrics: AccountLiveMetricsResult;
}

export interface DashboardRuntimeOverviewResult extends AccountsRuntimeOverviewResult {
  copyGroups: CopyGroupRuntimeOverview;
  operationsOverview: OperationsOverviewResult;
  tradeAnalytics: DashboardTradeAnalytics;
}

interface BuildAccountsRuntimeOverviewInput {
  userAccounts: Account[];
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
}

const FAILED_TRADE_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);

function pickTradeTimestamp(record: TradeHistoryRecord): string {
  return (
    record.filledAt ??
    record.acknowledgedAt ??
    record.sentAt ??
    record.failedAt ??
    record.queuedAt ??
    record.updatedAt ??
    record.createdAt
  );
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

export async function buildAccountsRuntimeOverview(
  input: BuildAccountsRuntimeOverviewInput,
): Promise<AccountsRuntimeOverviewResult> {
  const [positionSnapshot, accountLiveMetrics] = await Promise.all([
    buildPositionSnapshots(input.userAccounts, input.positionSnapshotDependencies),
    buildAccountLiveMetrics(input.userAccounts, input.accountLiveMetricsDependencies),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    positionSnapshot,
    accountLiveMetrics,
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
  };

  const copyGroups: CopyGroupRuntimeOverview = {
    groups: input.registeredGroups.map((registeredGroup) => {
      const runtime = input.getRuntime(registeredGroup.group.groupId);

      return {
        group: registeredGroup,
        runtime: runtime
          ? {
              state: runtime.state,
              statistics: runtime.statistics,
              health: runtime.health,
            }
          : undefined,
        activity: runtime ? input.getRecentActivity(registeredGroup.group.groupId) : [],
      };
    }),
    runningGroups: input
      .getRunningGroups()
      .filter((runtime) => runtime.group.userId === input.userAccounts[0]?.userId)
      .map((runtime) => runtime.group.groupId),
  };

  return {
    ...accountsOverview,
    copyGroups,
    operationsOverview,
    tradeAnalytics,
  };
}
