import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated position snapshot endpoint", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/positions\/snapshot"/);
  assert.match(routesSource, /req\.session\?\.userId/);
  assert.match(routesSource, /buildPositionSnapshots/);
  assert.match(routesSource, /tradovateInstances/);
  assert.match(routesSource, /tradeifyInstances/);
  assert.match(routesSource, /operationalLogger\.error\("runtime\.position_snapshot_load_failed"/);
  assert.match(routesSource, /message: "Failed to load position snapshot"/);
});
