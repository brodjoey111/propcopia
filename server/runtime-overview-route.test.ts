import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated runtime overview endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/runtime\/accounts-overview"/);
  assert.match(routesSource, /app\.get\("\/api\/position-sync\/plans"/);
  assert.match(routesSource, /app\.get\("\/api\/runtime\/dashboard-overview"/);
  assert.match(routesSource, /app\.post\("\/api\/runtime\/dashboard-overview\/recheck"/);
  assert.match(routesSource, /app\.post\("\/api\/runtime\/dashboard-overview\/recheck\/:historyId"/);
  assert.match(routesSource, /app\.post\("\/api\/runtime\/dashboard-overview\/review\/:historyId"/);
  assert.match(routesSource, /buildAccountsRuntimeOverview/);
  assert.match(routesSource, /buildDashboardRuntimeOverview/);
  assert.match(routesSource, /loadPositionSyncOverviewForUser/);
  assert.match(routesSource, /scope:\s*"position-sync-plans"/);
  assert.match(routesSource, /req\.query\.groupId/);
  assert.match(routesSource, /filterPositionSyncOverviewByGroupId/);
  assert.match(routesSource, /getOrCreateRuntimeSnapshot/);
  assert.match(routesSource, /clearRuntimeSnapshotCache/);
});
