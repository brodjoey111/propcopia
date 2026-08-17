import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("account name route validates and updates only the signed-in owner's account", () => {
  assert.match(routesSource, /app\.patch\("\/api\/accounts\/:id\/name"/);
  assert.match(routesSource, /const parsedName = parseAccountName\(req\.body\);/);
  assert.match(routesSource, /eq\(accounts\.id, req\.params\.id\), eq\(accounts\.userId, req\.session\.userId\)/);
  assert.match(routesSource, /\.set\(\{ name: parsedName\.name \}\)/);
});

test("account name route refreshes runtime snapshots without changing broker state", () => {
  assert.match(routesSource, /clearRuntimeSnapshotCache\(req\.session\.userId\);/);
  const route = routesSource.slice(
    routesSource.indexOf('app.patch("/api/accounts/:id/name"'),
    routesSource.indexOf('app.patch("/api/accounts/:id/broker-settings"'),
  );
  assert.doesNotMatch(route, /connect|disconnect|rithmicInstances|tradeCopyEngines/);
});
