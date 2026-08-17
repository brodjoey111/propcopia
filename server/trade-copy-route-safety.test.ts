import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");
const startRoute = source.slice(
  source.indexOf('app.post("/api/trade-copy/start"'),
  source.indexOf('app.post("/api/trade-copy/add-follower"'),
);

test("trade-copy start is bound to the authenticated session", () => {
  assert.match(startRoute, /if \(!req\.session\?\.userId\)/);
  assert.match(startRoute, /const userId = req\.session\.userId/);
  assert.match(startRoute, /req\.body\.userId !== userId/);
  assert.doesNotMatch(startRoute, /const \{ userId, masterAccountId/);
});

test("trade-copy start checks the kill switch before creating an engine", () => {
  const guardIndex = startRoute.indexOf("if (killSwitchState.active)");
  const engineIndex = startRoute.indexOf("new TradeCopyEngine");

  assert.ok(guardIndex >= 0);
  assert.ok(engineIndex > guardIndex);
  assert.match(startRoute, /res\.status\(423\)/);
  assert.doesNotMatch(source, /app\.use\("\/api\/trade-copy\/start"/);
});

test("kill-switch controls require an authenticated session", () => {
  const killSwitchRoutes = source.slice(source.indexOf('app.get("/api/kill-switch/status"'));
  assert.equal((killSwitchRoutes.match(/if \(!req\.session\?\.userId\)/g) ?? []).length, 3);
});

test("kill-switch activation blocks new starts before asynchronous shutdown work", () => {
  const activationRoute = source.slice(
    source.indexOf('app.post("/api/kill-switch/activate"'),
    source.indexOf('app.post("/api/kill-switch/deactivate"'),
  );
  const activeIndex = activationRoute.indexOf("killSwitchState.active = true");
  const shutdownIndex = activationRoute.indexOf("await activeEngine.disconnect()");

  assert.ok(activeIndex >= 0);
  assert.ok(shutdownIndex > activeIndex);
});

test("kill-switch state and engine shutdown are isolated to the authenticated user", () => {
  assert.match(source, /const killSwitchStates = new Map<string, KillSwitchState>\(\)/);
  assert.match(source, /getKillSwitchState\(req\.session\.userId\)/);
  assert.match(source, /const activeEngine = tradeCopyEngines\.get\(userId\)/);
  assert.doesNotMatch(source, /for \(const \[uid, engine\] of Array\.from\(tradeCopyEngines\.entries\(\)\)\)/);
});
