export interface NotificationItem {
  id: string;
  timestamp: string;
  severity: "info" | "warn" | "error";
  category: "copy_group" | "trade" | "position";
  title: string;
  message: string;
  accountId?: string;
  groupId?: string;
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
  errors: number;
  warnings: number;
}

export type NotificationFilter = "all" | "trade" | "copy_group" | "position" | "error" | "warn";

export function toActivityFeedType(
  notification: NotificationItem,
): "trade" | "connection" | "error" | "success" {
  if (notification.severity === "error") {
    return "error";
  }

  if (notification.category === "trade") {
    return "trade";
  }

  if (notification.category === "position" || notification.category === "copy_group") {
    return "connection";
  }

  return "success";
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
