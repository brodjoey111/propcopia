import type { AccountRiskFollowUpItem } from "./account-risk";
import type { NotificationItem, RiskNotificationFollowUpItem } from "./notifications";
import type { ExecutionRecoveryFollowUpItem } from "./runtime-overview";

export interface FollowUpOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface RiskFollowUpReviewEntry {
  accountId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: FollowUpOperatorAssignment[];
  reviewedAt?: string;
}

export interface ExecutionFollowUpReviewEntry {
  historyId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: FollowUpOperatorAssignment[];
  reviewedAt?: string;
}

export interface RithmicReadinessReviewEntry {
  storyKey: string;
  accountId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: FollowUpOperatorAssignment[];
  reviewedAt?: string;
}

export type RiskFollowUpFilter = "all" | "open" | "reviewed" | "owned" | "unowned" | "reassigned";
export type ExecutionFollowUpFilter = "all" | "open" | "reviewed" | "failed" | "stale" | "partial" | "active";
export type RithmicReadinessFollowUpFilter =
  | "all"
  | "open"
  | "reviewed"
  | "owned"
  | "unowned"
  | "reassigned";

export interface RiskFollowUpItemView extends AccountRiskFollowUpItem {
  notificationId: string;
  notificationTimestamp?: string;
  review?: RiskFollowUpReviewEntry;
}

export interface RithmicReadinessFollowUpItemView {
  id: string;
  storyKey: string;
  accountId: string;
  accountName: string;
  title: string;
  detail: string;
  severity: NotificationItem["severity"];
  actionLabel: string;
  timestamp: string;
  review?: RithmicReadinessReviewEntry;
}

export function buildRiskFollowUpReviewPayload(input: {
  accountId: string;
  currentReview?: RiskFollowUpReviewEntry;
  operatorName?: string;
  note?: string;
  status: "pending" | "reviewed";
  assignmentReason?: string;
  reviewedAt?: string;
}): RiskFollowUpReviewEntry {
  const now = input.reviewedAt ?? new Date().toISOString();
  const effectiveOperatorName = input.operatorName ?? input.currentReview?.operatorName;

  return {
    accountId: input.accountId,
    status: input.status,
    note: input.note,
    operatorName: effectiveOperatorName,
    operatorHistory: input.assignmentReason
      ? appendRiskFollowUpOperatorAssignment(
          input.currentReview?.operatorHistory,
          effectiveOperatorName,
          now,
          input.assignmentReason,
        )
      : input.currentReview?.operatorHistory,
    reviewedAt: input.status === "reviewed" ? now : input.currentReview?.reviewedAt,
  };
}

export function buildExecutionFollowUpReviewPayload(input: {
  historyId: string;
  currentReview?: ExecutionFollowUpReviewEntry;
  operatorName?: string;
  note?: string;
  status: "pending" | "reviewed";
  assignmentReason?: string;
  reviewedAt?: string;
}): ExecutionFollowUpReviewEntry {
  const now = input.reviewedAt ?? new Date().toISOString();
  const effectiveOperatorName = input.operatorName ?? input.currentReview?.operatorName;

  return {
    historyId: input.historyId,
    status: input.status,
    note: input.note,
    operatorName: effectiveOperatorName,
    operatorHistory: input.assignmentReason
      ? appendExecutionFollowUpOperatorAssignment(
          input.currentReview?.operatorHistory,
          effectiveOperatorName,
          now,
          input.assignmentReason,
        )
      : input.currentReview?.operatorHistory,
    reviewedAt: input.status === "reviewed" ? now : input.currentReview?.reviewedAt,
  };
}

export function buildRithmicReadinessReviewPayload(input: {
  storyKey: string;
  accountId: string;
  currentReview?: RithmicReadinessReviewEntry;
  operatorName?: string;
  note?: string;
  status: "pending" | "reviewed";
  assignmentReason?: string;
  reviewedAt?: string;
}): RithmicReadinessReviewEntry {
  const now = input.reviewedAt ?? new Date().toISOString();
  const effectiveOperatorName = input.operatorName ?? input.currentReview?.operatorName;

  return {
    storyKey: input.storyKey,
    accountId: input.accountId,
    status: input.status,
    note: input.note,
    operatorName: effectiveOperatorName,
    operatorHistory: input.assignmentReason
      ? appendOperatorAssignment(
          input.currentReview?.operatorHistory,
          effectiveOperatorName,
          now,
          input.assignmentReason,
        )
      : input.currentReview?.operatorHistory,
    reviewedAt: input.status === "reviewed" ? now : input.currentReview?.reviewedAt,
  };
}

function appendOperatorAssignment(
  history: FollowUpOperatorAssignment[] | undefined,
  operatorName: string | undefined,
  assignedAt: string,
  reason?: string,
): FollowUpOperatorAssignment[] | undefined {
  if (!operatorName) {
    return history;
  }

  const nextHistory = history ? [...history] : [];
  const previousAssignment = nextHistory[nextHistory.length - 1];

  if (previousAssignment?.operatorName === operatorName) {
    return nextHistory;
  }

  nextHistory.push({
    operatorName,
    assignedAt,
    reason,
  });

  return nextHistory;
}

export function appendRiskFollowUpOperatorAssignment(
  history: FollowUpOperatorAssignment[] | undefined,
  operatorName: string | undefined,
  assignedAt: string,
  reason?: string,
): FollowUpOperatorAssignment[] | undefined {
  return appendOperatorAssignment(history, operatorName, assignedAt, reason);
}

export function appendExecutionFollowUpOperatorAssignment(
  history: FollowUpOperatorAssignment[] | undefined,
  operatorName: string | undefined,
  assignedAt: string,
  reason?: string,
): FollowUpOperatorAssignment[] | undefined {
  return appendOperatorAssignment(history, operatorName, assignedAt, reason);
}

export function buildRiskFollowUpItems(input: {
  accountItems: AccountRiskFollowUpItem[];
  notificationItems: RiskNotificationFollowUpItem[];
  reviews: RiskFollowUpReviewEntry[];
}): RiskFollowUpItemView[] {
  return input.accountItems.map((item) => {
    const matchingNotification = input.notificationItems.find(
      (notification) => notification.id === item.accountId || notification.id.includes(item.accountId),
    );
    const review = input.reviews.find((entry) => entry.accountId === item.accountId);

    return {
      ...item,
      notificationId: matchingNotification?.id ?? item.accountId,
      notificationTimestamp: matchingNotification?.timestamp,
      review,
    };
  });
}

export function filterRiskFollowUpItems(
  items: RiskFollowUpItemView[],
  filter: RiskFollowUpFilter,
  searchQuery: string,
): RiskFollowUpItemView[] {
  return items.filter((item) => {
    if (filter === "open" && item.review?.status === "reviewed") {
      return false;
    }

    if (filter === "reviewed" && item.review?.status !== "reviewed") {
      return false;
    }

    if (filter === "owned" && !item.review?.operatorName) {
      return false;
    }

    if (filter === "unowned" && item.review?.operatorName) {
      return false;
    }

    if (filter === "reassigned" && (item.review?.operatorHistory?.length ?? 0) <= 1) {
      return false;
    }

    const search = searchQuery.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return [
      item.accountName,
      item.headline,
      item.detail,
      item.recommendedAction,
      item.review?.operatorName,
      item.review?.note,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

export function summarizeRiskFollowUpItems(items: RiskFollowUpItemView[]): {
  reviewedCount: number;
  ownedCount: number;
  unownedCount: number;
  reassignedCount: number;
} {
  return {
    reviewedCount: items.filter((item) => item.review?.status === "reviewed").length,
    ownedCount: items.filter((item) => !!item.review?.operatorName).length,
    unownedCount: items.filter((item) => !item.review?.operatorName).length,
    reassignedCount: items.filter((item) => (item.review?.operatorHistory?.length ?? 0) > 1).length,
  };
}

function isRithmicReadinessNotification(
  notification: NotificationItem,
): notification is NotificationItem & { storyKey: string; accountId: string } {
  return (
    typeof notification.storyKey === "string" &&
    notification.storyKey.startsWith("rithmic-readiness:") &&
    typeof notification.accountId === "string" &&
    notification.accountId.length > 0
  );
}

function getRithmicReadinessAccountName(notification: NotificationItem): string {
  const trimmed = notification.title.replace(/\s+Rithmic readiness.*$/i, "").trim();
  return trimmed.length > 0 ? trimmed : notification.accountId ?? "Rithmic account";
}

export function buildRithmicReadinessFollowUpItems(
  notifications: NotificationItem[],
  reviews: RithmicReadinessReviewEntry[],
): RithmicReadinessFollowUpItemView[] {
  const reviewsByStoryKey = new Map(
    reviews.map((review) => [review.storyKey, review]),
  );

  return notifications
    .filter(isRithmicReadinessNotification)
    .map((notification) => {
      const review =
        reviewsByStoryKey.get(notification.storyKey) ??
        (notification.reviewStatus === "reviewed" ||
        notification.reviewNote ||
        notification.reviewedAt
          ? {
              storyKey: notification.storyKey,
              accountId: notification.accountId,
              status: notification.reviewStatus ?? "pending",
              note: notification.reviewNote,
              reviewedAt: notification.reviewedAt,
            }
          : undefined);

      return {
        id: notification.id,
        storyKey: notification.storyKey,
        accountId: notification.accountId,
        accountName: getRithmicReadinessAccountName(notification),
        title: notification.title,
        detail: notification.message,
        severity: notification.severity,
        actionLabel:
          notification.severity === "warn"
            ? "Capture fresh reconnect proof before the next restart."
            : "Review the saved account evidence before relying on this session.",
        timestamp: notification.timestamp,
        review,
      };
    });
}

export function filterRithmicReadinessFollowUpItems(
  items: RithmicReadinessFollowUpItemView[],
  filter: RithmicReadinessFollowUpFilter,
  searchQuery: string,
): RithmicReadinessFollowUpItemView[] {
  return items.filter((item) => {
    if (filter === "open" && item.review?.status === "reviewed") {
      return false;
    }

    if (filter === "reviewed" && item.review?.status !== "reviewed") {
      return false;
    }

    if (filter === "owned" && !item.review?.operatorName) {
      return false;
    }

    if (filter === "unowned" && item.review?.operatorName) {
      return false;
    }

    if (filter === "reassigned" && (item.review?.operatorHistory?.length ?? 0) <= 1) {
      return false;
    }

    const search = searchQuery.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return [
      item.accountName,
      item.title,
      item.detail,
      item.actionLabel,
      item.review?.operatorName,
      item.review?.note,
      item.storyKey,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

export function summarizeRithmicReadinessFollowUpItems(
  items: RithmicReadinessFollowUpItemView[],
): {
  reviewedCount: number;
  ownedCount: number;
  unownedCount: number;
  reassignedCount: number;
} {
  return {
    reviewedCount: items.filter((item) => item.review?.status === "reviewed").length,
    ownedCount: items.filter((item) => !!item.review?.operatorName).length,
    unownedCount: items.filter((item) => !item.review?.operatorName).length,
    reassignedCount: items.filter((item) => (item.review?.operatorHistory?.length ?? 0) > 1).length,
  };
}

export function mergeExecutionFollowUpItems(
  items: ExecutionRecoveryFollowUpItem[],
  reviews: ExecutionFollowUpReviewEntry[],
): ExecutionRecoveryFollowUpItem[] {
  return items.map((item) => {
    const review = reviews.find((entry) => entry.historyId === item.historyId);

    return {
      ...item,
      reviewStatus: review?.status ?? item.reviewStatus,
      reviewNote: review?.note ?? item.reviewNote,
      reviewedAt: review?.reviewedAt ?? item.reviewedAt,
      operatorName: review?.operatorName ?? item.operatorName,
      operatorHistory: review?.operatorHistory ?? item.operatorHistory,
    };
  });
}

export function filterExecutionFollowUpItems(
  items: ExecutionRecoveryFollowUpItem[],
  filter: ExecutionFollowUpFilter,
  searchQuery: string,
  notesByHistoryId: Record<string, string>,
): ExecutionRecoveryFollowUpItem[] {
  return items.filter((item) => {
    if (filter === "open" && item.reviewStatus === "reviewed") {
      return false;
    }

    if (filter === "reviewed" && item.reviewStatus !== "reviewed") {
      return false;
    }

    if (
      (filter === "failed" ||
        filter === "stale" ||
        filter === "partial" ||
        filter === "active") &&
      item.category !== filter
    ) {
      return false;
    }

    const search = searchQuery.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return [
      item.symbol,
      item.followerAccountId,
      item.headline,
      item.detail,
      item.actionLabel,
      item.checkpoint.label,
      item.checkpoint.detail,
      item.recoveryWindow.label,
      item.recoveryWindow.detail,
      item.reviewNote,
      notesByHistoryId[item.historyId],
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

export function summarizeExecutionFollowUpItems(items: ExecutionRecoveryFollowUpItem[]): {
  reviewedCount: number;
  failedCount: number;
  staleCount: number;
  partialCount: number;
  activeCount: number;
} {
  return {
    reviewedCount: items.filter((item) => item.reviewStatus === "reviewed").length,
    failedCount: items.filter((item) => item.category === "failed").length,
    staleCount: items.filter((item) => item.category === "stale").length,
    partialCount: items.filter((item) => item.category === "partial").length,
    activeCount: items.filter((item) => item.category === "active").length,
  };
}
