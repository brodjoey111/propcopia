import assert from "node:assert/strict";
import test from "node:test";

import {
  applyNotificationPreferences,
  buildRiskNotificationFollowUpQueue,
  clusterNotifications,
  describeActivityNotificationMessage,
  describeExecutionAttentionNotification,
  describeNotificationMessage,
  filterReviewedNotifications,
  getTopNotification,
  toActivityFeedType,
  type NotificationItem,
} from "./notifications";

function createNotification(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id: overrides.id ?? "notification-1",
    timestamp: overrides.timestamp ?? "2026-08-04T12:00:00.000Z",
    severity: overrides.severity ?? "info",
    category: overrides.category ?? "copy_group",
    title: overrides.title ?? "Title",
    message: overrides.message ?? "Message",
    accountId: overrides.accountId,
    groupId: overrides.groupId,
    storyKey: overrides.storyKey,
    tradeSummary: overrides.tradeSummary,
  };
}

test("toActivityFeedType maps trade notifications to trade entries", () => {
  assert.equal(
    toActivityFeedType(createNotification({ category: "trade", severity: "warn" })),
    "trade",
  );
});

test("toActivityFeedType maps reviewed trade failures to success entries", () => {
  assert.equal(
    toActivityFeedType(
      createNotification({
        category: "trade",
        severity: "error",
        tradeSummary: {
          symbol: "ES",
          lifecycleStatus: "FAILED",
          storyState: "failed",
          attention: "alert",
          relatedEventCount: 0,
          reviewStatus: "reviewed",
        },
      }),
    ),
    "success",
  );
});

test("toActivityFeedType maps errors to error entries", () => {
  assert.equal(
    toActivityFeedType(createNotification({ category: "position", severity: "error" })),
    "error",
  );
});

test("toActivityFeedType maps copy-group and position notifications to connection entries", () => {
  assert.equal(
    toActivityFeedType(createNotification({ category: "copy_group", severity: "info" })),
    "connection",
  );
  assert.equal(
    toActivityFeedType(createNotification({ category: "position", severity: "warn" })),
    "connection",
  );
  assert.equal(
    toActivityFeedType(createNotification({ category: "risk", severity: "warn" })),
    "connection",
  );
});

test("describeExecutionAttentionNotification flags failed trade alerts as attention items", () => {
  const view = describeExecutionAttentionNotification(
    createNotification({
      category: "trade",
      severity: "error",
      title: "ES failed",
      message: "Broker unavailable",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "FAILED",
        storyState: "failed",
        attention: "alert",
        relatedEventCount: 0,
      },
    }),
  );

  assert.deepEqual(view, {
    state: "alert",
    label: "Failed",
  });
});

test("describeExecutionAttentionNotification flags partial and acknowledged trade alerts as watch items", () => {
  const partialView = describeExecutionAttentionNotification(
    createNotification({
      category: "trade",
      severity: "warn",
      title: "ES partial fill",
      message: "1 order still needs remaining fills",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "PARTIALLY_FILLED",
        storyState: "partial",
        attention: "watch",
        relatedEventCount: 1,
        filledQuantity: 1,
        remainingQuantity: 1,
      },
    }),
  );
  const acknowledgedView = describeExecutionAttentionNotification(
    createNotification({
      category: "trade",
      severity: "warn",
      title: "ES acknowledged",
      message: "Broker acknowledged order and is waiting on fills",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "ACKNOWLEDGED",
        storyState: "working",
        attention: "watch",
        relatedEventCount: 0,
      },
    }),
  );

  assert.deepEqual(partialView, {
    state: "watch",
    label: "Partial fill",
  });
  assert.deepEqual(acknowledgedView, {
    state: "watch",
    label: "Waiting on fill",
  });
});

test("describeExecutionAttentionNotification flags completed trade alerts as cleared fills", () => {
  const view = describeExecutionAttentionNotification(
    createNotification({
      category: "trade",
      severity: "info",
      title: "ES filled",
      message: "ES completed 2/2 at 6402.50. Final update: Execution filled",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "FILLED",
        storyState: "complete",
        attention: "ok",
        relatedEventCount: 1,
        filledQuantity: 2,
        remainingQuantity: 0,
      },
    }),
  );

  assert.deepEqual(view, {
    state: "ok",
    label: "Filled",
  });
});

test("describeExecutionAttentionNotification flags reviewed trade alerts as handled items", () => {
  const view = describeExecutionAttentionNotification(
    createNotification({
      category: "trade",
      severity: "error",
      title: "ES failed reviewed",
      message: "Reviewed failure",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "FAILED",
        storyState: "failed",
        attention: "alert",
        relatedEventCount: 0,
        reviewStatus: "reviewed",
      },
    }),
  );

  assert.deepEqual(view, {
    state: "ok",
    label: "Reviewed",
  });
});

test("describeNotificationMessage compacts reviewed trade failures", () => {
  const message = describeNotificationMessage(
    createNotification({
      category: "trade",
      severity: "error",
      title: "ES failed reviewed",
      message: "Reviewed failure: Checked broker logs and left for retry review",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "FAILED",
        storyState: "failed",
        attention: "alert",
        relatedEventCount: 0,
        reviewStatus: "reviewed",
        reviewNote: "Checked broker logs and left for retry review",
      },
    }),
  );

  assert.equal(message, "Reviewed failure. Checked broker logs and left for retry review");
});

test("describeActivityNotificationMessage compacts reviewed failures for the activity feed", () => {
  const message = describeActivityNotificationMessage(
    createNotification({
      category: "trade",
      severity: "error",
      title: "ES failed reviewed",
      message: "Reviewed failure: Checked broker logs and left for retry review",
      tradeSummary: {
        symbol: "ES",
        lifecycleStatus: "FAILED",
        storyState: "failed",
        attention: "alert",
        relatedEventCount: 0,
        reviewStatus: "reviewed",
        reviewNote: "Checked broker logs and left for retry review",
      },
    }),
  );

  assert.equal(
    message,
    "Reviewed: ES failed reviewed. Review note: Checked broker logs and left for retry review",
  );
});

test("clusterNotifications rolls consecutive trade updates for the same order path together", () => {
  const notifications = clusterNotifications([
    createNotification({
      id: "trade-filled",
      category: "trade",
      accountId: "acct-1",
      storyKey: "intent-1",
      title: "ES filled",
      message: "Execution filled",
      timestamp: "2026-08-04T12:03:00.000Z",
    }),
    createNotification({
      id: "trade-partial",
      category: "trade",
      severity: "warn",
      accountId: "acct-1",
      storyKey: "intent-1",
      title: "ES partial fill",
      message: "Partial fill recorded",
      timestamp: "2026-08-04T12:02:00.000Z",
    }),
    createNotification({
      id: "trade-ack",
      category: "trade",
      severity: "warn",
      accountId: "acct-1",
      storyKey: "intent-1",
      title: "ES acknowledged",
      message: "Broker acknowledged order",
      timestamp: "2026-08-04T12:01:00.000Z",
    }),
    createNotification({
      id: "copy-warn",
      category: "copy_group",
      severity: "warn",
      title: "Primary Group needs attention",
      message: "Follower reconnecting",
      timestamp: "2026-08-04T12:00:00.000Z",
    }),
  ]);

  assert.deepEqual(
    notifications.map((notification) => ({
      id: notification.id,
      relatedCount: notification.relatedCount,
      relatedIds: notification.relatedItems.map((item) => item.id),
    })),
    [
      {
        id: "trade-filled",
        relatedCount: 2,
        relatedIds: ["trade-partial", "trade-ack"],
      },
      {
        id: "copy-warn",
        relatedCount: 0,
        relatedIds: [],
      },
    ],
  );
});

test("getTopNotification prioritizes errors, then trade category, then recency", () => {
  const top = getTopNotification([
    createNotification({
      id: "copy-warn",
      severity: "warn",
      category: "copy_group",
      timestamp: "2026-08-04T12:01:00.000Z",
    }),
    createNotification({
      id: "trade-error",
      severity: "error",
      category: "trade",
      timestamp: "2026-08-04T12:00:00.000Z",
    }),
    createNotification({
      id: "position-error",
      severity: "error",
      category: "position",
      timestamp: "2026-08-04T12:02:00.000Z",
    }),
  ]);

  assert.equal(top?.id, "trade-error");
});

test("applyNotificationPreferences hides disabled trade and connection notifications", () => {
  const filtered = applyNotificationPreferences(
    [
      createNotification({ id: "trade-item", category: "trade" }),
      createNotification({ id: "copy-group-item", category: "copy_group" }),
      createNotification({ id: "position-item", category: "position" }),
      createNotification({ id: "risk-item", category: "risk" }),
    ],
    {
      notifyTrades: false,
      notifyConnection: false,
    },
  );

  assert.deepEqual(filtered.map((notification) => notification.id), ["risk-item"]);
});

test("filterReviewedNotifications hides reviewed trade failures when requested", () => {
  const filtered = filterReviewedNotifications(
    [
      createNotification({
        id: "reviewed-trade",
        category: "trade",
        severity: "error",
        tradeSummary: {
          symbol: "ES",
          lifecycleStatus: "FAILED",
          storyState: "failed",
          attention: "alert",
          relatedEventCount: 0,
          reviewStatus: "reviewed",
        },
      }),
      createNotification({
        id: "active-trade",
        category: "trade",
        severity: "warn",
        tradeSummary: {
          symbol: "NQ",
          lifecycleStatus: "ACKNOWLEDGED",
          storyState: "working",
          attention: "watch",
          relatedEventCount: 0,
        },
      }),
      createNotification({
        id: "copy-group-item",
        category: "copy_group",
        severity: "warn",
      }),
    ],
    false,
  );

  assert.deepEqual(filtered.map((notification) => notification.id), [
    "active-trade",
    "copy-group-item",
  ]);
});

test("applyNotificationPreferences hides error notifications when disabled", () => {
  const filtered = applyNotificationPreferences(
    [
      createNotification({ id: "error-item", category: "trade", severity: "error" }),
      createNotification({ id: "warn-item", category: "trade", severity: "warn" }),
    ],
    {
      notifyErrors: false,
      notifyTrades: true,
    },
  );

  assert.deepEqual(filtered.map((notification) => notification.id), ["warn-item"]);
});

test("buildRiskNotificationFollowUpQueue prioritizes risk errors and adds operator actions", () => {
  const result = buildRiskNotificationFollowUpQueue([
    createNotification({
      id: "risk-warn",
      category: "risk",
      severity: "warn",
      title: "Follower nearing daily limit",
      message: "Daily loss is close to the configured threshold.",
      timestamp: "2026-08-04T12:01:00.000Z",
    }),
    createNotification({
      id: "risk-error",
      category: "risk",
      severity: "error",
      title: "Follower breached account floor",
      message: "Account balance is below the configured minimum.",
      timestamp: "2026-08-04T12:00:00.000Z",
    }),
    createNotification({
      id: "copy-warn",
      category: "copy_group",
      severity: "warn",
    }),
  ]);

  assert.deepEqual(
    result.map((item) => ({
      id: item.id,
      actionLabel: item.actionLabel,
    })),
    [
      {
        id: "risk-error",
        actionLabel: "Keep this account out of new copy sessions until limits are reviewed.",
      },
      {
        id: "risk-warn",
        actionLabel: "Review sizing and limits before the next group start.",
      },
    ],
  );
});
