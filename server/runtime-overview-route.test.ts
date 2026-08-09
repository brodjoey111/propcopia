import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated runtime overview endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/runtime\/accounts-overview"/);
  assert.match(routesSource, /app\.get\("\/api\/runtime\/dashboard-overview"/);
  assert.match(routesSource, /buildAccountsRuntimeOverview/);
  assert.match(routesSource, /buildDashboardRuntimeOverview/);
  assert.match(routesSource, /getOrCreateRuntimeSnapshot/);
});
