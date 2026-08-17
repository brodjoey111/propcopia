import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import { evaluateAccountRisk } from "./account-risk-service";
import type { CopyGroupActivity, CopyGroupObservability } from "./copy-group-types";
import type { CopyGroupAlertRecord } from "./copy-group-alerts";
import { buildPositionSnapshots, type PositionSnapshotDependencies } from "./position-snapshot-service";
import {
  tradeHistoryStore,
  type TradeHistoryLifecycleStatus,
} from "./trade-history-store";
import type { RithmicReconnectValidationStore } from "./rithmic-reconnect-validation";
import { buildRithmicReadiness, type RithmicReadinessApiLike } from "./rithmic-readiness-service";
import type { PersistedRithmicReadinessReview } from "./rithmic-readiness-review-store";
import type { PersistedPositionSyncReview } from "./position-sync-review-store";
import type { PersistedExecutionFollowUpReview } from "./execution-follow-up-review-store";

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
  reviewStatus?: "pending" | "reviewed";
  reviewNote?: string;
  reviewedAt?: string;
  restartRecoveryMessage?: string;
  restartRecoveryAt?: string;
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
    operatorName?: string;
    operatorHistory?: Array<{
      operatorName: string;
      assignedAt: string;
      reason?: string;
    }>;
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
  getObservability?: (groupId: string) => CopyGroupObservability | undefined;
  copyGroupAlertStories?: CopyGroupAlertRecord[];
  positionSnapshotDependencies: PositionSnapshotDependencies;
  rithmicInstances?: Map<string, RithmicReadinessApiLike>;
  rithmicReconnectValidationStore?: RithmicReconnectValidationStore;
  rithmicReadinessReviews?: PersistedRithmicReadinessReview[];
  positionSyncReviews?: PersistedPositionSyncReview[];
  executionFollowUpReviews?: PersistedExecutionFollowUpReview[];
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
const FAILED_TRADE_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);
const ACTIVE_TRADE_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "SENT",
  "ACKNOWLEDGED",
  "PARTIALLY_FILLED",
]);
const EXECUTION_STALE_THRESHOLD_MINUTES = 5;
const EXECUTION_REVIEW_OVERDUE_THRESHOLD_MINUTES = 15;
const EXECUTION_FOLLOW_UP_ALERT_WINDOW_MINUTES = 24 * 60;

function mapActivitySeverity(severity: CopyGroupActivity["severity"]): NotificationSeverity {
  return severity === "ERROR" ? "error" : severity === "WARN" ? "warn" : "info";
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildCopyGroupNotification(input: {
  registeredGroup: RegisteredCopyGroup;
  activity: CopyGroupActivity[];
  observability?: CopyGroupObservability;
}): NotificationItem | null {
  const actionableActivity = input.activity.filter((entry) => entry.severity !== "INFO");
  const latest = actionableActivity[0];

  if (!latest) {
    return null;
  }

  const errorCount = actionableActivity.filter((entry) => entry.severity === "ERROR").length;
  const warningCount = actionableActivity.filter((entry) => entry.severity === "WARN").length;
  const healthCount = actionableActivity.filter((entry) => entry.category === "HEALTH").length;
  const lifecycleCount = actionableActivity.filter((entry) => entry.category === "LIFECYCLE").length;
  const observability = input.observability;
  const lifecycleMessage =
    observability?.lastLifecycleMessage &&
    observability.lastLifecycleMessage !== latest.message
      ? observability.lastLifecycleMessage
      : undefined;
  const detailParts = [
    errorCount > 0 ? pluralize(errorCount, "error") : null,
    warningCount > 0 ? pluralize(warningCount, "warning") : null,
    healthCount > 0 ? pluralize(healthCount, "health signal") : null,
    lifecycleCount > 0 ? pluralize(lifecycleCount, "lifecycle update") : null,
  ].filter((value): value is string => Boolean(value));
  const detailLabel = detailParts.length > 0 ? ` Active signals: ${detailParts.join(", ")}.` : "";
  const lifecycleLabel = lifecycleMessage ? ` Last lifecycle update: ${lifecycleMessage}` : "";
  const title =
    latest.severity === "ERROR"
      ? `${input.registeredGroup.group.name} recovery required`
      : `${input.registeredGroup.group.name} needs follow-up`;

  return {
    id: `copy-group-alert:${latest.groupId}`,
    timestamp: latest.timestamp,
    severity: mapActivitySeverity(latest.severity),
    category: "copy_group",
    title,
    message: `${latest.message}.${detailLabel}${lifecycleLabel}`.replace(/\.\./g, "."),
    groupId: latest.groupId,
    accountId: latest.followerAccountId,
    storyKey: `copy-group:${latest.groupId}`,
    restartRecoveryMessage: observability?.lastRestartRecoveryMessage,
    restartRecoveryAt: observability?.lastRestartRecoveryAt,
  };
}

function formatTradeLifecycleLabel(status: TradeHistoryLifecycleStatus): string {
  return status.toLowerCase().replace(/_/g, " ");
}

function pickTradeTimestamp(
  record: ReturnType<typeof tradeHistoryStore.get> extends infer T ? Exclude<T, undefined> : never,
): string {
  return (
    record.failedAt ??
    record.filledAt ??
    record.acknowledgedAt ??
    record.updatedAt ??
    record.createdAt
  );
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

function buildRithmicReadinessNotifications(input: {
  accounts: Account[];
  rithmicInstances?: Map<string, RithmicReadinessApiLike>;
  rithmicReconnectValidationStore?: RithmicReconnectValidationStore;
  reviewsByStoryKey: Map<string, PersistedRithmicReadinessReview>;
  generatedAt: string;
}): NotificationItem[] {
  const notifications: NotificationItem[] = [];

  for (const account of input.accounts) {
    if (account.platform !== "Rithmic") {
      continue;
    }

    const api =
      account.rithmicUsername && input.rithmicInstances
        ? input.rithmicInstances.get(account.rithmicUsername)
        : undefined;
    const reconnectValidation = input.rithmicReconnectValidationStore?.get(account.id);
    const readiness = buildRithmicReadiness(account, api, reconnectValidation);
    const storyKey = `rithmic-readiness:${account.id}`;
    const review = input.reviewsByStoryKey.get(storyKey);

    if (readiness.ready) {
      continue;
    }

    const primaryBlocker = readiness.blockers[0] ?? "Rithmic readiness needs review.";
    const needsReconnectProof = !readiness.reconnectValidated;

    notifications.push({
      id: `rithmic-readiness:${account.id}:${needsReconnectProof ? "reconnect" : "review"}`,
      timestamp: reconnectValidation?.validatedAt ?? readiness.loginMetadata?.timestamp ?? input.generatedAt,
      severity: needsReconnectProof ? "warn" : "error",
      category: "position",
      title: `${account.name} Rithmic readiness ${needsReconnectProof ? "needs reconnect proof" : "needs review"}`,
      message: `${primaryBlocker} ${readiness.sessionActive ? "Open Broker Settings or use Re-check readiness to refresh the saved proof." : "Reconnect the saved account to capture fresh login evidence."}`.trim(),
      accountId: account.id,
      storyKey,
      reviewStatus: review?.status ?? "pending",
      reviewNote: review?.note,
      reviewedAt: review?.reviewedAt,
    });
  }

  return notifications;
}

function withOperatorTradeSummary(
  tradeSummary: NonNullable<NotificationItem["tradeSummary"]>,
  review?: PersistedExecutionFollowUpReview,
): NonNullable<NotificationItem["tradeSummary"]> {
  if (!review?.operatorName && !review?.operatorHistory?.length) {
    return tradeSummary;
  }

  return {
    ...tradeSummary,
    operatorName: review.operatorName,
    operatorHistory: review.operatorHistory,
  };
}

function buildExecutionFollowUpNotifications(input: {
  records: Array<ReturnType<typeof tradeHistoryStore.get> extends infer T ? Exclude<T, undefined> : never>;
  reviewsByHistoryId: Map<string, PersistedExecutionFollowUpReview>;
  now: Date;
}): NotificationItem[] {
  const notifications: NotificationItem[] = [];
  const nowMs = input.now.getTime();

  for (const record of input.records) {
    const review = input.reviewsByHistoryId.get(record.historyId);
    const reviewStatus = review?.status ?? record.reviewStatus;
    if (reviewStatus === "reviewed") {
      continue;
    }

    const timestamp = pickTradeTimestamp(record);
    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      continue;
    }

    const ageMinutes = Math.max(
      0,
      Math.floor((nowMs - parsedTimestamp.getTime()) / 60_000),
    );

    if (
      ageMinutes > EXECUTION_FOLLOW_UP_ALERT_WINDOW_MINUTES ||
      ageMinutes < EXECUTION_STALE_THRESHOLD_MINUTES
    ) {
      continue;
    }

    const ownerLabel = review?.operatorName
      ? ` Assigned operator: ${review.operatorName}.`
      : " No operator assigned.";

    if (FAILED_TRADE_STATUSES.has(record.lifecycleStatus)) {
      if (ageMinutes < EXECUTION_REVIEW_OVERDUE_THRESHOLD_MINUTES) {
        continue;
      }

      notifications.push({
        id: `execution-follow-up:${record.historyId}:review`,
        timestamp,
        severity: "error",
        category: "trade",
        title: `${record.symbol} execution follow-up overdue`,
        message: `${formatTradeLifecycleLabel(record.lifecycleStatus)} has been waiting ${ageMinutes} minutes for operator review.${ownerLabel}`,
        accountId: record.followerAccountId,
        storyKey: record.historyId,
        tradeSummary: withOperatorTradeSummary({
          symbol: record.symbol,
          lifecycleStatus: record.lifecycleStatus,
          storyState: "failed",
          attention: "alert",
          relatedEventCount: Math.max(record.events.length - 1, 0),
          filledQuantity: record.filledQuantity,
          remainingQuantity: record.remainingQuantity,
          reviewStatus,
          reviewNote: review?.note ?? record.reviewNote,
          reviewedAt: review?.reviewedAt ?? record.reviewedAt,
        }, review),
      });
      continue;
    }

    if (!ACTIVE_TRADE_STATUSES.has(record.lifecycleStatus)) {
      continue;
    }

    notifications.push({
      id: `execution-follow-up:${record.historyId}:stale`,
      timestamp,
      severity: "warn",
      category: "trade",
      title: `${record.symbol} broker recheck overdue`,
      message: `${formatTradeLifecycleLabel(record.lifecycleStatus)} has been in flight for ${ageMinutes} minutes without a new lifecycle update.${ownerLabel}`,
      accountId: record.followerAccountId,
      storyKey: record.historyId,
      tradeSummary: withOperatorTradeSummary({
        symbol: record.symbol,
        lifecycleStatus: record.lifecycleStatus,
        storyState: record.lifecycleStatus === "PARTIALLY_FILLED" ? "partial" : "working",
        attention: "watch",
        relatedEventCount: Math.max(record.events.length - 1, 0),
        filledQuantity: record.filledQuantity,
        remainingQuantity: record.remainingQuantity,
        reviewStatus,
        reviewNote: review?.note ?? record.reviewNote,
        reviewedAt: review?.reviewedAt ?? record.reviewedAt,
      }, review),
    });
  }

  return notifications;
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
  const executionFollowUpReviewsByHistoryId = new Map(
    (input.executionFollowUpReviews ?? []).map((review) => [review.historyId, review]),
  );
  const rithmicReadinessReviewsByStoryKey = new Map(
    (input.rithmicReadinessReviews ?? []).map((review) => [review.storyKey, review]),
  );
  const copyGroupAlertByGroupId = new Map(
    (input.copyGroupAlertStories ?? []).map((alert) => [alert.groupId, alert]),
  );

  for (const registeredGroup of input.registeredGroups) {
    const notification = copyGroupAlertByGroupId.get(registeredGroup.group.groupId)
        ? {
            id: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.alertId,
            timestamp: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.timestamp,
            severity: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.severity,
          category: "copy_group" as const,
          title: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.title,
            message: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.message,
            groupId: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.groupId,
            accountId: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.accountId,
            storyKey: copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.storyKey,
            restartRecoveryMessage:
              copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.restartRecoveryMessage,
            restartRecoveryAt:
              copyGroupAlertByGroupId.get(registeredGroup.group.groupId)!.restartRecoveryAt,
          }
      : buildCopyGroupNotification({
          registeredGroup,
          activity: input.getRecentActivity(registeredGroup.group.groupId),
          observability: input.getObservability?.(registeredGroup.group.groupId),
        });

    if (notification) {
      notifications.push(notification);
    }
  }

  const recentTrades = tradeHistoryStore.listRecent({
    accountIds: userAccountIds,
    limit: 100,
  });
  const tradeAlerts = recentTrades.filter((record) =>
    TRADE_NOTIFICATION_STATUSES.has(record.lifecycleStatus),
  );

  for (const record of tradeAlerts) {
    const review = executionFollowUpReviewsByHistoryId.get(record.historyId);
    const notification = buildTradeNotification({
      ...record,
      reviewStatus: review?.status ?? record.reviewStatus,
      reviewNote: review?.note ?? record.reviewNote,
      reviewedAt: review?.reviewedAt ?? record.reviewedAt,
    });

    if (notification.tradeSummary) {
      notification.tradeSummary = withOperatorTradeSummary(notification.tradeSummary, review);
    }

    notifications.push(notification);
  }

  notifications.push(
    ...buildPositionSyncFollowUpNotifications({
      reviews: input.positionSyncReviews ?? [],
      accountsById: accountById,
      groupsById,
      now,
    }),
  );
  notifications.push(
    ...buildExecutionFollowUpNotifications({
      records: recentTrades,
      reviewsByHistoryId: executionFollowUpReviewsByHistoryId,
      now,
    }),
  );
  notifications.push(
    ...buildRithmicReadinessNotifications({
      accounts: input.userAccounts,
      rithmicInstances: input.rithmicInstances,
      rithmicReconnectValidationStore: input.rithmicReconnectValidationStore,
      reviewsByStoryKey: rithmicReadinessReviewsByStoryKey,
      generatedAt,
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
