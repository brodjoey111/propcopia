import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

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
  assert.match(routesSource, /await rithmicReconnectCoordinator\.waitFor\(existing\.id\)/);
  assert.match(
    routesSource,
    /isConnected: false,[\s\S]*?accountConnectionRecoveryStore\.disconnected\(req\.session\.userId, id\)/,
  );
});
