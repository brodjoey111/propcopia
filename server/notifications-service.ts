import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import { evaluateAccountRisk } from "./account-risk-service";
import type { CopyGroupActivity } from "./copy-group-types";
import { buildPositionSnapshots, type PositionSnapshotDependencies } from "./position-snapshot-service";
import {
  tradeHistoryStore,
  type TradeHistoryLifecycleStatus,
} from "./trade-history-store";
import type { PersistedPositionSyncReview } from "./position-sync-review-store";

export type NotificationSeverity = "info" | "warn" | "error";
export type NotificationCategory = "copy_group" | "trade" | "position" | "risk";
export type TradeNotificationStoryState = "working" | "partial" | "complete" | "failed";
export type TradeNotificationAttentionState = "alert" | "watch" | "ok";

export interface NotificationItem {
  id: string;
  timestamp: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  title: string;
  message: string;
  accountId?: string;
  groupId?: string;
  storyKey?: string;
  tradeSummary?: {
    symbol: string;
    lifecycleStatus: TradeHistoryLifecycleStatus;
    storyState: TradeNotificationStoryState;
    attention: TradeNotificationAttentionState;
    relatedEventCount: number;
    filledQuantity?: number;
    remainingQuantity?: number;
    reviewStatus?: "pending" | "reviewed";
    reviewNote?: string;
    reviewedAt?: string;
  };
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
  positionSyncReviews?: PersistedPositionSyncReview[];
  now?: Date;
}

const TRADE_NOTIFICATION_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FILLED",
  "ACKNOWLEDGED",
  "PARTIALLY_FILLED",
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);

function mapActivitySeverity(severity: CopyGroupActivity["severity"]): NotificationSeverity {
  return severity === "ERROR" ? "error" : severity === "WARN" ? "warn" : "info";
}

function formatTradeLifecycleLabel(status: TradeHistoryLifecycleStatus): string {
  return status.toLowerCase().replace(/_/g, " ");
}

function summarizeTradeStoryState(
  status: TradeHistoryLifecycleStatus,
): {
  storyState: TradeNotificationStoryState;
  attention: TradeNotificationAttentionState;
} {
  if (status === "FILLED") {
    return {
      storyState: "complete",
      attention: "ok",
    };
  }

  if (status === "ACKNOWLEDGED" || status === "PARTIALLY_FILLED") {
    return {
      storyState: status === "PARTIALLY_FILLED" ? "partial" : "working",
      attention: "watch",
    };
  }

  return {
    storyState: "failed",
    attention: status === "RULE_SKIPPED" ? "watch" : "alert",
  };
}

function summarizeTradeNotificationMessage(record: ReturnType<typeof tradeHistoryStore.get> extends infer T ? Exclude<T, undefined> : never): string {
  const eventCount = record.events.length;
  const latestEvent = record.events[0]?.message;

  if (record.lifecycleStatus === "FILLED") {
    const filled = record.filledQuantity ?? record.quantity ?? 0;
    const quantity = record.quantity ?? filled;
    const fillPrice =
      typeof record.averageFillPrice === "number"
        ? ` at ${record.averageFillPrice.toFixed(2)}`
        : "";
    return `${record.symbol} completed ${filled}/${quantity}${fillPrice}.${latestEvent ? ` Final update: ${latestEvent}` : ""}`;
  }

  if (record.lifecycleStatus === "PARTIALLY_FILLED") {
    const filled = record.filledQuantity ?? 0;
    const remaining = record.remainingQuantity ?? 0;
    const quantity = record.quantity ?? filled + remaining;
    return `${record.symbol} is partially filled (${filled}/${quantity}). ${remaining} remaining.${latestEvent ? ` Latest update: ${latestEvent}` : ""}`;
  }

  if (record.lifecycleStatus === "ACKNOWLEDGED") {
    return `${record.symbol} is acknowledged and waiting on fills.${latestEvent ? ` Latest update: ${latestEvent}` : ""}`;
  }

  if (record.lifecycleStatus === "RULE_SKIPPED" || record.lifecycleStatus === "RULE_REJECTED") {
    if (record.reviewStatus === "reviewed" && record.reviewNote) {
      return `Reviewed: ${record.reviewNote}`;
    }
    return record.lastErrorMessage ?? record.ruleReasonCode ?? latestEvent ?? `Trade lifecycle moved to ${record.lifecycleStatus}`;
  }

  if (
    record.reviewStatus === "reviewed" &&
    (record.lifecycleStatus === "FAILED" || record.lifecycleStatus === "CANCELLED")
  ) {
    return record.reviewNote
      ? `Reviewed failure: ${record.reviewNote}`
      : "This failure has already been reviewed.";
  }

  if (eventCount > 1 && latestEvent) {
    return `${latestEvent} ${eventCount - 1} earlier lifecycle update${eventCount - 1 === 1 ? "" : "s"} captured for this order.`;
  }

  return (
    record.lastErrorMessage ??
    record.ruleReasonCode ??
    latestEvent ??
    `Trade lifecycle moved to ${record.lifecycleStatus}`
  );
}

function buildTradeNotification(record: ReturnType<typeof tradeHistoryStore.get> extends infer T ? Exclude<T, undefined> : never): NotificationItem {
  const lifecycleLabel = formatTradeLifecycleLabel(record.lifecycleStatus);
  const tradeStory = summarizeTradeStoryState(record.lifecycleStatus);
  const severity: NotificationSeverity =
    record.lifecycleStatus === "FILLED"
      ? "info"
      : record.lifecycleStatus === "ACKNOWLEDGED" || record.lifecycleStatus === "PARTIALLY_FILLED" || record.lifecycleStatus === "RULE_SKIPPED"
      ? "warn"
      : "error";

  return {
    id: `trade:${record.historyId}`,
    timestamp: record.failedAt ?? record.filledAt ?? record.acknowledgedAt ?? record.updatedAt ?? record.createdAt,
    severity,
    category: "trade",
    title:
      record.reviewStatus === "reviewed" &&
      (record.lifecycleStatus === "FAILED" ||
        record.lifecycleStatus === "CANCELLED" ||
        record.lifecycleStatus === "RULE_SKIPPED" ||
        record.lifecycleStatus === "RULE_REJECTED")
        ? `${record.symbol} ${lifecycleLabel} reviewed`
        : `${record.symbol} ${lifecycleLabel}`,
    message: summarizeTradeNotificationMessage(record),
    accountId: record.followerAccountId,
    storyKey: record.historyId,
    tradeSummary: {
      symbol: record.symbol,
      lifecycleStatus: record.lifecycleStatus,
      storyState: tradeStory.storyState,
      attention: tradeStory.attention,
      relatedEventCount: Math.max(record.events.length - 1, 0),
      filledQuantity: record.filledQuantity,
      remainingQuantity: record.remainingQuantity,
      reviewStatus: record.reviewStatus,
      reviewNote: record.reviewNote,
      reviewedAt: record.reviewedAt,
    },
  };
}

function buildPositionSyncFollowUpNotifications(input: {
  reviews: PersistedPositionSyncReview[];
  accountsById: Map<string, Account>;
  groupsById: Map<string, RegisteredCopyGroup>;
  now: Date;
}): NotificationItem[] {
  const notifications: NotificationItem[] = [];

  for (const review of input.reviews) {
    if (review.status !== "approved" && review.status !== "handed_off") {
      continue;
    }

    const timestamp =
      review.handedOffAt ??
      review.approvedAt ??
      review.reviewedAt ??
      review.simulatedAt;

    if (!timestamp) {
      continue;
    }

    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      continue;
    }

    const ageMinutes = Math.max(
      0,
      Math.floor((input.now.getTime() - parsedTimestamp.getTime()) / 60_000),
    );

    if (ageMinutes < 30) {
      continue;
    }

    const group = input.groupsById.get(review.groupId);
    const account = input.accountsById.get(review.followerAccountId);
    const groupName = group?.group.name ?? review.groupId;
    const followerName = account?.name ?? review.followerAccountId;
    const ownerLabel = review.operatorName
      ? ` Assigned operator: ${review.operatorName}.`
      : " No operator assigned.";

    notifications.push({
      id: `position-sync-follow-up:${review.groupId}:${review.followerAccountId}:${review.status}`,
      timestamp,
      severity: review.status === "handed_off" ? "error" : "warn",
      category: "copy_group",
      title:
        review.status === "handed_off"
          ? `${groupName} manual sync completion overdue`
          : `${groupName} manual sync handoff overdue`,
      message:
        review.status === "handed_off"
          ? `${followerName} has been waiting ${ageMinutes} minutes for manual completion.${ownerLabel}`
          : `${followerName} has been approved for ${ageMinutes} minutes without operator handoff.${ownerLabel}`,
      groupId: review.groupId,
      accountId: review.followerAccountId,
      storyKey: `position-sync:${review.groupId}:${review.followerAccountId}`,
    });
  }

  return notifications;
}

export async function buildNotifications(
  input: BuildNotificationsInput,
): Promise<NotificationsResult> {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const notifications: NotificationItem[] = [];
  const userAccountIds = input.userAccounts.map((account) => account.id);
  const accountNameById = new Map(input.userAccounts.map((account) => [account.id, account.name]));
  const accountById = new Map(input.userAccounts.map((account) => [account.id, account]));
  const groupsById = new Map(
    input.registeredGroups.map((registeredGroup) => [registeredGroup.group.groupId, registeredGroup]),
  );

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
    notifications.push(buildTradeNotification(record));
  }

  notifications.push(
    ...buildPositionSyncFollowUpNotifications({
      reviews: input.positionSyncReviews ?? [],
      accountsById: accountById,
      groupsById,
      now,
    }),
  );

  const positionSnapshots = await buildPositionSnapshots(
    input.userAccounts,
    input.positionSnapshotDependencies,
  );
  const positionSnapshotsById = new Map(
    positionSnapshots.accounts.map((account) => [account.accountId, account]),
  );

  for (const account of input.userAccounts) {
    const risk = evaluateAccountRisk({
      account,
      positionSnapshot: positionSnapshotsById.get(account.id),
    });

    if (risk.status === "OK" || risk.status === "UNAVAILABLE") {
      continue;
    }

    notifications.push({
      id: `risk:${account.id}:${risk.status}`,
      timestamp: positionSnapshotsById.get(account.id)?.capturedAt ?? generatedAt,
      severity: risk.status === "BREACHED" ? "error" : "warn",
      category: "risk",
      title: `${account.name} risk ${risk.status === "BREACHED" ? "breached" : "warning"}`,
      message:
        risk.rules
          .filter((rule) =>
            risk.status === "BREACHED"
              ? rule.status === "BREACHED"
              : rule.status === "WARN",
          )
          .map((rule) => rule.message)
          .join(" ") || `Risk status changed to ${risk.status}.`,
      accountId: account.id,
    });
  }

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
