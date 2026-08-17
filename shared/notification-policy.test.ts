import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNotificationPolicy,
  buildNotificationDeliveryPreview,
  isNotificationEnabled,
} from "./notification-policy.ts";

const notifications = [
  { id: "trade", category: "trade", severity: "warn" },
  { id: "connection", category: "copy_group", severity: "warn" },
  { id: "position", category: "position", severity: "info" },
  { id: "risk-error", category: "risk", severity: "error" },
  { id: "risk-warn", category: "risk", severity: "warn" },
] as const;

test("notification policy deterministically applies each saved preference", () => {
  const result = applyNotificationPolicy([...notifications], {
    notifyTrades: false,
    notifyConnection: false,
    notifyErrors: false,
  });

  assert.deepEqual(result.map((item) => item.id), ["risk-warn"]);
  assert.equal(isNotificationEnabled(notifications[0], { notifyTrades: true }), true);
});

test("delivery preview reports eligible and suppressed counts without external delivery", () => {
  const preview = buildNotificationDeliveryPreview([...notifications], {
    notifyTrades: false,
    notifyConnection: true,
    notifyErrors: false,
  });

  assert.deepEqual(preview.notifications.map((item) => item.id), ["connection", "position", "risk-warn"]);
  assert.deepEqual(preview.summary, {
    generatedCount: 5,
    inAppEligibleCount: 3,
    preferenceSuppressedCount: 2,
    channels: {
      inApp: { available: true },
      email: { available: false },
      push: { available: false },
    },
  });
});
