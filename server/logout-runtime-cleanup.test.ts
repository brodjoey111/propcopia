import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");
const cleanup = source.slice(
  source.indexOf("async function cleanupUserRouteRuntime"),
  source.indexOf("const tradeHistoryStatuses"),
);
const logout = source.slice(
  source.indexOf('app.post("/api/auth/logout"'),
  source.indexOf('app.post("/api/auth/change-password"'),
);

test("logout cleanup stops only the authenticated user's runtime resources", () => {
  assert.match(cleanup, /tradeCopyEngines\.get\(userId\)/);
  assert.match(cleanup, /registration\.group\.userId === userId/);
  assert.match(cleanup, /tradovateInstances\.removeUser\(userId\)/);
  assert.match(cleanup, /tradeifyInstances\.removeUser\(userId\)/);
  assert.match(cleanup, /rithmicInstances\.removeUser\(userId\)/);
  assert.match(cleanup, /session\.disconnect\(\)/);
  assert.match(cleanup, /clearRuntimeSnapshotCache\(userId\)/);
});

test("logout performs runtime cleanup before destroying the browser session", () => {
  assert.match(logout, /const userId = req\.session\?\.userId/);
  assert.match(logout, /await cleanupUserRouteRuntime\(userId\)/);
  assert.ok(
    logout.indexOf("await cleanupUserRouteRuntime(userId)") < logout.indexOf("session.destroy"),
  );
});
