export interface NotificationItem {
  id: string;
  timestamp: string;
  severity: "info" | "warn" | "error";
  category: "copy_group" | "trade" | "position" | "risk";
  title: string;
  message: string;
  accountId?: string;
  groupId?: string;
  storyKey?: string;
  tradeSummary?: {
    symbol: string;
    lifecycleStatus:
      | "FILLED"
      | "ACKNOWLEDGED"
      | "PARTIALLY_FILLED"
      | "FAILED"
      | "CANCELLED"
      | "RULE_SKIPPED"
      | "RULE_REJECTED";
    storyState: "working" | "partial" | "complete" | "failed";
    attention: "alert" | "watch" | "ok";
    relatedEventCount: number;
    filledQuantity?: number;
    remainingQuantity?: number;
    reviewStatus?: "pending" | "reviewed";
    reviewNote?: string;
    reviewedAt?: string;
  };
}

export interface NotificationsResponse {
  success: boolean;
  generatedAt: string;
  unreadEstimate: number;
  notifications: NotificationItem[];
}

export interface NotificationSummary {
  total: number;
  trade: number;
  copyGroup: number;
  position: number;
  risk: number;
  errors: number;
  warnings: number;
}

export interface ExecutionAttentionNotificationView {
  state: "alert" | "watch" | "ok";
  label: string;
}

export interface ClusteredNotificationItem extends NotificationItem {
  relatedCount: number;
  relatedItems: NotificationItem[];
}

export interface NotificationPreferences {
  notifyTrades?: boolean;
  notifyErrors?: boolean;
  notifyConnection?: boolean;
}

export type NotificationFilter = "all" | "trade" | "copy_group" | "position" | "risk" | "error" | "warn";

export interface RiskNotificationFollowUpItem {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "error";
  actionLabel: string;
  timestamp: string;
}

export function toActivityFeedType(
  notification: NotificationItem,
): "trade" | "connection" | "error" | "success" {
  if (
    notification.category === "trade" &&
    notification.tradeSummary?.reviewStatus === "reviewed"
  ) {
    return "success";
  }

  if (notification.severity === "error") {
    return "error";
  }

  if (notification.category === "trade") {
    return "trade";
  }

  if (
    notification.category === "position" ||
    notification.category === "copy_group" ||
    notification.category === "risk"
  ) {
    return "connection";
  }

  return "success";
}

export function describeExecutionAttentionNotification(
  notification: NotificationItem,
): ExecutionAttentionNotificationView {
  if (notification.category === "trade" && notification.tradeSummary) {
    if (notification.tradeSummary.reviewStatus === "reviewed") {
      return {
        state: "ok",
        label: "Reviewed",
      };
    }

    if (notification.tradeSummary.storyState === "complete") {
      return {
        state: "ok",
        label: "Filled",
      };
    }

    if (notification.tradeSummary.storyState === "partial") {
      return {
        state: "watch",
        label: "Partial fill",
      };
    }

    if (notification.tradeSummary.storyState === "working") {
      return {
        state: "watch",
        label: "Waiting on fill",
      };
    }

    return {
      state: notification.tradeSummary.attention,
      label:
        notification.tradeSummary.lifecycleStatus === "RULE_SKIPPED"
          ? "Skipped"
          : notification.tradeSummary.lifecycleStatus === "RULE_REJECTED"
            ? "Rejected"
            : notification.tradeSummary.lifecycleStatus === "CANCELLED"
              ? "Cancelled"
              : "Failed",
    };
  }

  if (notification.category !== "trade") {
    return {
      state: notification.severity === "error" ? "alert" : notification.severity === "warn" ? "watch" : "ok",
      label: notification.severity === "error" ? "Needs attention" : notification.severity === "warn" ? "Watch" : "Info",
    };
  }

  const normalized = `${notification.title} ${notification.message}`.toLowerCase();

  if (
    normalized.includes("failed") ||
    normalized.includes("rejected") ||
    normalized.includes("cancelled")
  ) {
    return {
      state: "alert",
      label: "Failed",
    };
  }

  if (normalized.includes("partial")) {
    return {
      state: "watch",
      label: "Partial fill",
    };
  }

  if (normalized.includes("acknowledged") || normalized.includes("waiting on fills")) {
    return {
      state: "watch",
      label: "Waiting on fill",
    };
  }

  if (normalized.includes("filled") || normalized.includes("completed")) {
    return {
      state: "ok",
      label: "Filled",
    };
  }

  return {
    state: notification.severity === "error" ? "alert" : notification.severity === "warn" ? "watch" : "ok",
    label: notification.category === "trade" ? "Trade alert" : "Info",
  };
}

export function describeNotificationMessage(notification: NotificationItem): string {
  if (
    notification.category === "trade" &&
    notification.tradeSummary?.reviewStatus === "reviewed"
  ) {
    if (notification.tradeSummary.reviewNote) {
      return `Reviewed failure. ${notification.tradeSummary.reviewNote}`;
    }

    return "Reviewed failure.";
  }

  return notification.message;
}

export function describeActivityNotificationMessage(notification: NotificationItem): string {
  const label = describeExecutionAttentionNotification(notification).label;

  if (
    notification.category === "trade" &&
    notification.tradeSummary?.reviewStatus === "reviewed"
  ) {
    if (notification.tradeSummary.reviewNote) {
      return `${label}: ${notification.title}. Review note: ${notification.tradeSummary.reviewNote}`;
    }

    return `${label}: ${notification.title}. Reviewed failure.`;
  }

  return `${label}: ${notification.title}: ${notification.message}`;
}

export function summarizeNotifications(
  notifications: NotificationItem[],
): NotificationSummary {
  return notifications.reduce<NotificationSummary>(
    (summary, notification) => {
      summary.total += 1;
      if (notification.category === "trade") {
        summary.trade += 1;
      } else if (notification.category === "copy_group") {
        summary.copyGroup += 1;
      } else if (notification.category === "position") {
        summary.position += 1;
      } else if (notification.category === "risk") {
        summary.risk += 1;
      }

      if (notification.severity === "error") {
        summary.errors += 1;
      }

      if (notification.severity === "warn") {
        summary.warnings += 1;
      }

      return summary;
    },
    {
      total: 0,
      trade: 0,
      copyGroup: 0,
      position: 0,
      risk: 0,
      errors: 0,
      warnings: 0,
    },
  );
}

export function filterNotifications(
  notifications: NotificationItem[],
  filter: NotificationFilter,
  query: string,
): NotificationItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return notifications.filter((notification) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "error"
          ? notification.severity === "error"
          : filter === "warn"
            ? notification.severity === "warn"
            : notification.category === filter;

    if (!matchesFilter) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    const searchable = [
      notification.title,
      notification.message,
      notification.category,
      notification.severity,
      notification.accountId,
      notification.groupId,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function applyNotificationPreferences(
  notifications: NotificationItem[],
  preferences: NotificationPreferences,
): NotificationItem[] {
  return notifications.filter((notification) => {
    if (notification.category === "trade" && preferences.notifyTrades === false) {
      return false;
    }

    const isConnectionNotification =
      notification.category === "copy_group" || notification.category === "position";
    if (isConnectionNotification && preferences.notifyConnection === false) {
      return false;
    }

    if (notification.severity === "error" && preferences.notifyErrors === false) {
      return false;
    }

    return true;
  });
}

export function buildRiskNotificationFollowUpQueue(
  notifications: NotificationItem[],
): RiskNotificationFollowUpItem[] {
  return notifications
    .filter((notification) => notification.category === "risk")
    .sort((left, right) => {
      const leftPriority = left.severity === "error" ? 0 : left.severity === "warn" ? 1 : 2;
      const rightPriority = right.severity === "error" ? 0 : right.severity === "warn" ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    })
    .map((notification) => ({
      id: notification.id,
      title: notification.title,
      detail: notification.message,
      severity: notification.severity,
      actionLabel:
        notification.severity === "error"
          ? "Keep this account out of new copy sessions until limits are reviewed."
          : notification.severity === "warn"
            ? "Review sizing and limits before the next group start."
            : "Refresh risk inputs before making the next operator decision.",
      timestamp: notification.timestamp,
    }));
}

export function filterReviewedNotifications(
  notifications: NotificationItem[],
  includeReviewed: boolean,
): NotificationItem[] {
  if (includeReviewed) {
    return notifications;
  }

  return notifications.filter(
    (notification) => notification.tradeSummary?.reviewStatus !== "reviewed",
  );
}

function getNotificationClusterKey(notification: NotificationItem): string | null {
  if (notification.storyKey) {
    return notification.storyKey;
  }

  if (notification.category !== "trade") {
    return null;
  }

  const symbol = notification.title.trim().split(/\s+/)[0]?.toUpperCase();
  if (!symbol || !notification.accountId) {
    return null;
  }

  return `${notification.category}:${notification.accountId}:${symbol}`;
}

export function clusterNotifications(
  notifications: NotificationItem[],
): ClusteredNotificationItem[] {
  const clusters: ClusteredNotificationItem[] = [];

  for (const notification of notifications) {
    const previous = clusters[clusters.length - 1];
    const previousKey = previous ? getNotificationClusterKey(previous) : null;
    const currentKey = getNotificationClusterKey(notification);

    if (previous && previousKey && currentKey && previousKey === currentKey) {
      previous.relatedCount += 1;
      previous.relatedItems.push(notification);
      continue;
    }

    clusters.push({
      ...notification,
      relatedCount: 0,
      relatedItems: [],
    });
  }

  return clusters;
}

export function getTopNotification(
  notifications: NotificationItem[],
): NotificationItem | null {
  if (notifications.length === 0) {
    return null;
  }

  const severityRank = (severity: NotificationItem["severity"]): number => {
    if (severity === "error") {
      return 3;
    }

    if (severity === "warn") {
      return 2;
    }

    return 1;
  };

  const categoryRank = (category: NotificationItem["category"]): number => {
    if (category === "trade") {
      return 3;
    }

    if (category === "copy_group") {
      return 2;
    }

    return 1;
  };

  return [...notifications].sort((left, right) => {
    const severityDiff = severityRank(right.severity) - severityRank(left.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const categoryDiff = categoryRank(right.category) - categoryRank(left.category);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return right.timestamp.localeCompare(left.timestamp);
  })[0] ?? null;
}
