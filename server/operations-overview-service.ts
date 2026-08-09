import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import type { CopyGroupActivity } from "./copy-group-types";
import { buildPositionSnapshots, type PositionSnapshotDependencies } from "./position-snapshot-service";
import {
  tradeHistoryStore,
  type TradeHistoryLifecycleStatus,
  type TradeHistoryRecord,
} from "./trade-history-store";

export interface OperationsOverviewCopyGroupSummary {
  totalGroups: number;
  runningGroups: number;
  pausedGroups: number;
  unhealthyGroups: number;
  degradedGroups: number;
  alerts: number;
  connectedFollowers: number;
  totalFollowers: number;
}

export interface OperationsOverviewTradeSummary {
  total: number;
  filled: number;
  failed: number;
  pending: number;
  skippedOrRejected: number;
}

export interface OperationsOverviewActivityItem {
  eventId: string;
  groupId: string;
  groupName: string;
  timestamp: string;
  severity: "INFO" | "WARN" | "ERROR";
  category: "LIFECYCLE" | "TRADE" | "RULE" | "INTENT" | "EXECUTION" | "HEALTH";
  message: string;
}

export interface OperationsOverviewResult {
  generatedAt: string;
  copyGroups: OperationsOverviewCopyGroupSummary;
  positions: Awaited<ReturnType<typeof buildPositionSnapshots>>["summary"];
  trades: OperationsOverviewTradeSummary;
  recentAlerts: OperationsOverviewActivityItem[];
}

interface BuildOperationsOverviewInput {
  userAccounts: Account[];
  registeredGroups: RegisteredCopyGroup[];
  getRuntime: (groupId: string) => {
    state: {
      status: string;
      connectedFollowerCount: number;
      totalFollowerCount: number;
    };
    health: {
      status: string;
    };
  } | undefined;
  getRecentActivity: (groupId: string) => CopyGroupActivity[];
  positionSnapshotDependencies: PositionSnapshotDependencies;
}

const FAILED_TRADE_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
]);

export async function buildOperationsOverview(
  input: BuildOperationsOverviewInput,
): Promise<OperationsOverviewResult> {
  const positionSnapshots = await buildPositionSnapshots(
    input.userAccounts,
    input.positionSnapshotDependencies,
  );

  const accountIds = input.userAccounts.map((account) => account.id);
  const recentTrades = tradeHistoryStore.listRecent({
    accountIds,
    limit: 250,
  });

  const tradeSummary = recentTrades.reduce<OperationsOverviewTradeSummary>(
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

  const copyGroups = input.registeredGroups.map((registeredGroup) => {
    const runtime = input.getRuntime(registeredGroup.group.groupId);
    return {
      group: registeredGroup.group,
      runtime,
      activity: input.getRecentActivity(registeredGroup.group.groupId),
    };
  });

  const allAlerts = copyGroups
    .flatMap((group) =>
      group.activity
        .filter((activity) => activity.severity !== "INFO")
        .map<OperationsOverviewActivityItem>((activity) => ({
          eventId: activity.eventId,
          groupId: activity.groupId,
          groupName: group.group.name,
          timestamp: activity.timestamp,
          severity: activity.severity,
          category: activity.category,
          message: activity.message,
        })),
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    copyGroups: {
      totalGroups: copyGroups.length,
      runningGroups: copyGroups.filter((group) => group.runtime?.state.status === "RUNNING").length,
      pausedGroups: copyGroups.filter((group) => group.runtime?.state.status === "PAUSED").length,
      unhealthyGroups: copyGroups.filter((group) => group.runtime?.health.status === "UNHEALTHY").length,
      degradedGroups: copyGroups.filter((group) => group.runtime?.health.status === "DEGRADED").length,
      alerts: allAlerts.length,
      connectedFollowers: copyGroups.reduce(
        (sum, group) => sum + (group.runtime?.state.connectedFollowerCount ?? 0),
        0,
      ),
      totalFollowers: copyGroups.reduce(
        (sum, group) => sum + (group.runtime?.state.totalFollowerCount ?? 0),
        0,
      ),
    },
    positions: positionSnapshots.summary,
    trades: tradeSummary,
    recentAlerts: allAlerts,
  };
}
