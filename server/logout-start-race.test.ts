import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");
const startRoute = source.slice(
  source.indexOf('app.post("/api/trade-copy/start"'),
  source.indexOf('app.post("/api/trade-copy/add-follower"'),
);
const logoutRoute = source.slice(
  source.indexOf('app.post("/api/auth/logout"'),
  source.indexOf('app.post("/api/auth/change-password"'),
);

test("logout marks the user until browser-session destruction completes", () => {
  assert.match(source, /const usersLoggingOut = new Set<string>\(\)/);
  assert.match(logoutRoute, /usersLoggingOut\.add\(userId\)/);
  assert.match(logoutRoute, /session\.destroy\(\(err\) => \{\s*if \(userId\) usersLoggingOut\.delete\(userId\)/);
});

test("trade-copy startup checks logout state before and after broker wiring", () => {
  const guards = startRoute.match(/usersLoggingOut\.has\(userId\)/g) ?? [];
  assert.equal(guards.length, 2);

  const finalGuard = startRoute.lastIndexOf("if (usersLoggingOut.has(userId))");
  const registration = startRoute.indexOf("tradeCopyEngines.set(userId, engine)");
  assert.ok(finalGuard > startRoute.indexOf("engine.addFollowerAccount"));
  assert.ok(finalGuard < registration);
  assert.match(startRoute.slice(finalGuard, registration), /await engine\.disconnect\(\)/);
  assert.match(startRoute.slice(finalGuard, registration), /await cleanupUserRouteRuntime\(userId\)/);
});
