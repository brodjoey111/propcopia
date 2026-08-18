import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const connectRouteStart = routesSource.indexOf('app.post("/api/accounts/:id/connect"');
const connectRouteEnd = routesSource.indexOf('app.patch("/api/user/settings"', connectRouteStart);
const connectRouteSource = routesSource.slice(connectRouteStart, connectRouteEnd);
const disconnectRouteStart = routesSource.indexOf('app.post("/api/accounts/:id/disconnect"');
const disconnectRouteEnd = routesSource.indexOf('app.delete("/api/accounts/:id"', disconnectRouteStart);
const disconnectRouteSource = routesSource.slice(disconnectRouteStart, disconnectRouteEnd);

test("account recovery status route is authenticated and user-scoped", () => {
  assert.match(routesSource, /app\.get\("\/api\/accounts\/recovery-status"/);
  assert.match(routesSource, /accountConnectionRecoveryStore\.listForUser\(req\.session\.userId\)/);
});

test("Rithmic reconnect routes use one coordinated helper", () => {
  assert.match(routesSource, /rithmicReconnectCoordinator\.run\(account\.id/);
  assert.match(routesSource, /reconnectSavedRithmicAccountForUser\(/);
  assert.match(routesSource, /accountConnectionRecoveryStore\.begin/);
  assert.match(routesSource, /accountConnectionRecoveryStore\.recovered/);
  assert.match(routesSource, /accountConnectionRecoveryStore\.failed/);
});

test("intentional disconnect is recorded after the account is marked offline", () => {
  assert.ok(connectRouteStart >= 0 && connectRouteEnd > connectRouteStart);
  assert.ok(disconnectRouteStart >= 0 && disconnectRouteEnd > disconnectRouteStart);

  assert.match(connectRouteSource, /where\(and\(eq\(accounts\.id, id\), eq\(accounts\.userId, req\.session\.userId\)\)\)/);
  assert.match(connectRouteSource, /reconnectSavedRithmicAccountForUser\(\s*existing,\s*req\.session\.userId,\s*\)/);
  assert.match(connectRouteSource, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
  assert.match(connectRouteSource, /operationalLogger\.error\("account\.connect_failed"/);
  assert.match(connectRouteSource, /message: "Failed to connect account"/);

  assert.match(disconnectRouteSource, /await rithmicReconnectCoordinator\.waitFor\(existing\.id\)/);
  assert.match(disconnectRouteSource, /rithmicReconnectValidationStore\.clear\(existing\.id\)/);
  assert.match(
    disconnectRouteSource,
    /isConnected: false,[\s\S]*?accountConnectionRecoveryStore\.disconnected\(req\.session\.userId, id\)/,
  );
  assert.match(disconnectRouteSource, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
  assert.match(disconnectRouteSource, /operationalLogger\.error\("account\.disconnect_failed"/);
  assert.match(disconnectRouteSource, /message: "Failed to disconnect account"/);
});
