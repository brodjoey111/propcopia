import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import type { CopyGroupActivity } from "./copy-group-types";
import { buildPositionSnapshots, type PositionSnapshotDependencies } from "./position-snapshot-service";
import {
  tradeHistoryStore,
  type TradeHistoryLifecycleStatus,
} from "./trade-history-store";

export type NotificationSeverity = "info" | "warn" | "error";
export type NotificationCategory = "copy_group" | "trade" | "position";

export interface NotificationItem {
  id: string;
  timestamp: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  title: string;
  message: string;
  accountId?: string;
  groupId?: string;
}

export interface NotificationsResult {
  generatedAt: string;
  unreadEstimate: number;
  notifications: NotificationItem[];
}

interface BuildNotificationsInput {
  userAccounts: Account[];
  registeredGroups: RegisteredCopyGroup[];
  getRecentActivity: (groupId: string) => CopyGroupActivity[];
  positionSnapshotDependencies: PositionSnapshotDependencies;
}

const TRADE_NOTIFICATION_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);

function mapActivitySeverity(severity: CopyGroupActivity["severity"]): NotificationSeverity {
  return severity === "ERROR" ? "error" : severity === "WARN" ? "warn" : "info";
}

export async function buildNotifications(
  input: BuildNotificationsInput,
): Promise<NotificationsResult> {
  const generatedAt = new Date().toISOString();
  const notifications: NotificationItem[] = [];
  const userAccountIds = input.userAccounts.map((account) => account.id);
  const accountNameById = new Map(input.userAccounts.map((account) => [account.id, account.name]));

  for (const registeredGroup of input.registeredGroups) {
    const groupActivity = input
      .getRecentActivity(registeredGroup.group.groupId)
      .filter((activity) => activity.severity !== "INFO");

    for (const activity of groupActivity) {
      notifications.push({
        id: `cg:${activity.eventId}`,
        timestamp: activity.timestamp,
        severity: mapActivitySeverity(activity.severity),
        category: "copy_group",
        title: `${registeredGroup.group.name} needs attention`,
        message: activity.message,
        groupId: activity.groupId,
        accountId: activity.followerAccountId,
      });
    }
  }

  const tradeAlerts = tradeHistoryStore.listRecent({
    accountIds: userAccountIds,
    limit: 100,
  }).filter((record) => TRADE_NOTIFICATION_STATUSES.has(record.lifecycleStatus));

  for (const record of tradeAlerts) {
    notifications.push({
      id: `trade:${record.historyId}:${record.lifecycleStatus}`,
      timestamp:
        record.failedAt ??
        record.updatedAt ??
        record.createdAt,
      severity:
        record.lifecycleStatus === "RULE_SKIPPED"
          ? "warn"
          : record.lifecycleStatus === "RULE_REJECTED"
            ? "error"
            : "error",
      category: "trade",
      title: `${record.symbol} ${record.lifecycleStatus.toLowerCase().replace(/_/g, " ")}`,
      message:
        record.lastErrorMessage ??
        record.ruleReasonCode ??
        `Trade lifecycle moved to ${record.lifecycleStatus}`,
      accountId: record.followerAccountId,
    });
  }

  const positionSnapshots = await buildPositionSnapshots(
    input.userAccounts,
    input.positionSnapshotDependencies,
  );

  for (const accountSnapshot of positionSnapshots.accounts) {
    if (accountSnapshot.status === "LIVE") {
      continue;
    }

    notifications.push({
      id: `position:${accountSnapshot.accountId}:${accountSnapshot.status}`,
      timestamp: accountSnapshot.capturedAt,
      severity: accountSnapshot.status === "DISCONNECTED" ? "warn" : "info",
      category: "position",
      title: `${accountSnapshot.name} position snapshot ${accountSnapshot.status.toLowerCase()}`,
      message:
        accountSnapshot.reason ??
        `${accountNameById.get(accountSnapshot.accountId) ?? accountSnapshot.accountId} position data is not live.`,
      accountId: accountSnapshot.accountId,
    });
  }

  notifications.sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  return {
    generatedAt,
    unreadEstimate: notifications.length,
    notifications: notifications.slice(0, 50),
  };
}
