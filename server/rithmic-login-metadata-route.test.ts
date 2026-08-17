import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildRithmicConformanceSummary,
  buildRithmicLoginMetadata,
} from "./rithmic-login-metadata";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const apiSource = fs.readFileSync(new URL("./rithmic-api.ts", import.meta.url), "utf8");

test("Rithmic login helper normalizes the conformance metadata", () => {
  const metadata = buildRithmicLoginMetadata(
    {
      fcmId: " FCM-1 ",
      ibId: " IB-1 ",
      uniqueUserId: " USER-77 ",
    },
    {
      now: () => new Date("2026-08-12T14:30:00.000Z"),
      resolveTimezone: () => "America/New_York",
    },
  );

  assert.deepEqual(metadata, {
    fcmId: "FCM-1",
    ibId: "IB-1",
    uniqueUserId: "USER-77",
    timestamp: "2026-08-12T14:30:00.000Z",
    timezone: "America/New_York",
  });
});

test("Rithmic conformance summary keeps the email fields in a stable order", () => {
  const summary = buildRithmicConformanceSummary({
    fcmId: "FCM-1",
    ibId: "IB-1",
    uniqueUserId: "USER-77",
    timestamp: "2026-08-12T14:30:00.000Z",
    timezone: "America/New_York",
  });

  assert.deepEqual(summary.uniqueUserIds, ["USER-77"]);
  assert.deepEqual(summary.fields, [
    { label: "unique_user_id", value: "USER-77" },
    { label: "fcm_id", value: "FCM-1" },
    { label: "ib_id", value: "IB-1" },
    { label: "timestamp", value: "2026-08-12T14:30:00.000Z" },
    { label: "timezone", value: "America/New_York" },
  ]);
});

test("Rithmic API still reads unique user metadata from the login response", () => {
  assert.match(apiSource, /UNIQUE_USER_ID:\s+153428/);
  assert.match(apiSource, /const uniqueUserId = fields\.strings\.get\(FIELD\.UNIQUE_USER_ID\)\?\.\[0\] \?\? '';/);
  assert.match(apiSource, /const authData = buildRithmicLoginMetadata\(\{/);
});

test("Rithmic test-connection route returns login metadata to the client", () => {
  assert.match(routesSource, /app\.post\(\"\/api\/rithmic\/test-connection\"/);
  assert.match(routesSource, /authData: connectionTest\.authData/);
});
