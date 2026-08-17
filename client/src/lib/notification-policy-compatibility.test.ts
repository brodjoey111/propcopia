import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./notifications.ts", import.meta.url), "utf8");

test("client notification filtering delegates to the shared server policy", () => {
  assert.match(source, /applyNotificationPolicy/);
  assert.match(source, /return applyNotificationPolicy\(notifications, preferences\)/);
  assert.doesNotMatch(source, /notification\.category === "trade" && preferences\.notifyTrades/);
});
