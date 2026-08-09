import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated live account metrics endpoint", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/accounts\/live-metrics"/);
  assert.match(routesSource, /req\.session\?\.userId/);
  assert.match(routesSource, /buildAccountLiveMetrics/);
  assert.match(routesSource, /tradovateInstances/);
  assert.match(routesSource, /tradeifyInstances/);
  assert.match(routesSource, /rithmicInstances/);
});
