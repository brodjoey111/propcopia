import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated operations overview endpoint", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/operations\/overview"/);
  assert.match(routesSource, /req\.session\?\.userId/);
  assert.match(routesSource, /buildOperationsOverview/);
  assert.match(routesSource, /copyGroupManager\s*\.\s*getAllGroups\(\)/);
  assert.match(routesSource, /tradovateInstances/);
  assert.match(routesSource, /tradeifyInstances/);
});
