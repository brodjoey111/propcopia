import assert from "node:assert/strict";
import test from "node:test";

import {
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
  };
}

test("toActivityFeedType maps trade notifications to trade entries", () => {
  assert.equal(
    toActivityFeedType(createNotification({ category: "trade", severity: "warn" })),
    "trade",
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
