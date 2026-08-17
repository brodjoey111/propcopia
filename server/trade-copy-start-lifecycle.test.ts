import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");
const startRoute = source.slice(
  source.indexOf('app.post("/api/trade-copy/start"'),
  source.indexOf('app.post("/api/trade-copy/add-follower"'),
);

test("trade-copy startup reserves one in-progress attempt per user", () => {
  assert.match(source, /const tradeCopyStartsInProgress = new Set<string>\(\)/);
  assert.match(startRoute, /tradeCopyStartsInProgress\.has\(userId\)/);
  assert.match(startRoute, /tradeCopyStartsInProgress\.add\(userId\)/);
  assert.match(startRoute, /tradeCopyStartsInProgress\.delete\(reservedUserId\)/);
});

test("trade-copy engine is published only after follower wiring succeeds", () => {
  const createIndex = startRoute.indexOf("pendingEngine = new TradeCopyEngine");
  const addFollowerIndex = startRoute.indexOf("await engine.addFollowerAccount");
  const publishIndex = startRoute.indexOf("tradeCopyEngines.set(userId, engine)");

  assert.ok(createIndex >= 0);
  assert.ok(addFollowerIndex > createIndex);
  assert.ok(publishIndex > addFollowerIndex);
  assert.doesNotMatch(startRoute, /tradeCopyEngines\.set\(userId, engine\)[\s\S]*const \[masterAccount\]/);
});

test("failed startup disconnects and removes its pending engine", () => {
  assert.match(startRoute, /tradeCopyEngines\.delete\(reservedUserId\)/);
  assert.match(startRoute, /await pendingEngine\.disconnect\(\)\.catch/);
  assert.match(source, /tradeCopyStartsInProgress\.clear\(\)/);
});
