import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRithmicConformanceSummary,
  buildRithmicLoginMetadata,
} from "./rithmic-login-metadata";

test("buildRithmicLoginMetadata trims values and fills missing timestamp details", () => {
  const metadata = buildRithmicLoginMetadata(
    {
      fcmId: " FCM-9 ",
      ibId: " IB-9 ",
      uniqueUserId: " USER-9 ",
      timestamp: "not-a-date",
      timezone: "",
    },
    {
      now: () => new Date("2026-08-12T15:45:00.000Z"),
      resolveTimezone: () => "America/Chicago",
    },
  );

  assert.deepEqual(metadata, {
    fcmId: "FCM-9",
    ibId: "IB-9",
    uniqueUserId: "USER-9",
    timestamp: "2026-08-12T15:45:00.000Z",
    timezone: "America/Chicago",
  });
});

test("buildRithmicConformanceSummary preserves the email-ready field order", () => {
  const summary = buildRithmicConformanceSummary({
    fcmId: "FCM-9",
    ibId: "IB-9",
    uniqueUserId: "",
    timestamp: "2026-08-12T15:45:00.000Z",
    timezone: "UTC",
  });

  assert.deepEqual(summary.uniqueUserIds, []);
  assert.deepEqual(summary.fields, [
    { label: "unique_user_id", value: "" },
    { label: "fcm_id", value: "FCM-9" },
    { label: "ib_id", value: "IB-9" },
    { label: "timestamp", value: "2026-08-12T15:45:00.000Z" },
    { label: "timezone", value: "UTC" },
  ]);
});
