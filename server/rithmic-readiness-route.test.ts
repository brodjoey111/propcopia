import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const listRouteIndex = routesSource.indexOf('app.get("/api/accounts/rithmic-readiness"');
const accountRouteIndex = routesSource.indexOf('app.get("/api/accounts/:id/rithmic-readiness"');
const listRoute = routesSource.slice(listRouteIndex, accountRouteIndex);
const detailRouteEnd = routesSource.indexOf('app.post("/api/accounts/:id/rithmic-readiness/revalidate"', accountRouteIndex);
const detailRoute = routesSource.slice(accountRouteIndex, detailRouteEnd);
const revalidateRouteIndex = routesSource.indexOf('app.post("/api/accounts/:id/rithmic-readiness/revalidate"');
const revalidateRouteEnd = routesSource.indexOf('app.post("/api/accounts/:id/connect"', revalidateRouteIndex);
const revalidateRoute = routesSource.slice(revalidateRouteIndex, revalidateRouteEnd);

test("Rithmic readiness list is owner-scoped and precedes the parameter route", () => {
  assert.ok(listRouteIndex >= 0);
  assert.ok(accountRouteIndex > listRouteIndex);
  assert.match(listRoute, /eq\(accounts\.userId, userId\)/);
  assert.match(listRoute, /eq\(accounts\.platform, "Rithmic"\)/);
  assert.match(listRoute, /rithmicInstances\.forUser\(userId\)/);
  assert.match(listRoute, /rithmicReconnectValidationStore\.get\(account\.id\)/);
  assert.match(listRoute, /buildRithmicReadiness\(account, instance, reconnectValidation\)/);
  assert.match(listRoute, /accounts: readinessAccounts/);
  assert.match(listRoute, /operationalLogger\.error\("rithmic\.readiness_list_load_failed"/);
  assert.match(listRoute, /message: "Failed to load Rithmic readiness list"/);
});

test("Rithmic readiness route is account-scoped and requires an authenticated session", () => {
  assert.match(routesSource, /app\.get\(\"\/api\/accounts\/:id\/rithmic-readiness\"/);
  assert.match(routesSource, /if \(!req\.session\.userId\) \{/);
  assert.match(routesSource, /message: \"Not authenticated\"/);
});

test("Rithmic readiness route loads the saved account and rejects non-Rithmic accounts", () => {
  assert.match(
    routesSource,
    /where\(and\(eq\(accounts\.id, id\), eq\(accounts\.userId, req\.session\.userId\)\)\)/,
  );
  assert.match(routesSource, /if \(existing\.platform !== "Rithmic"\) \{/);
  assert.match(routesSource, /message: "Rithmic readiness is only available for Rithmic accounts\."/);
});

test("Rithmic readiness route builds the readiness payload from the user's cached Rithmic session", () => {
  assert.ok(detailRouteEnd > accountRouteIndex);
  assert.match(detailRoute, /rithmicInstances\.forUser\(req\.session\.userId\)\.get\(existing\.rithmicUsername\)/);
  assert.match(detailRoute, /const reconnectValidation = rithmicReconnectValidationStore\.get\(existing\.id\);/);
  assert.match(detailRoute, /const readiness = buildRithmicReadiness\(existing, instance, reconnectValidation\);/);
  assert.match(detailRoute, /return res\.json\(\{\s*success: true,\s*readiness,\s*\}\);/);
  assert.match(detailRoute, /operationalLogger\.error\("rithmic\.readiness_load_failed"/);
  assert.match(detailRoute, /message: "Failed to load Rithmic readiness"/);
});

test("Rithmic readiness revalidate route uses the shared saved reconnect workflow", () => {
  assert.ok(revalidateRouteIndex >= 0);
  assert.ok(revalidateRouteEnd > revalidateRouteIndex);
  assert.match(revalidateRoute, /const reconnect = await reconnectSavedRithmicAccountForUser\(/);
  assert.match(
    routesSource,
    /refreshIdentity: \(savedAccount, rithmicAPI\) =>\s*refreshRithmicAccountIdentity\(savedAccount, userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\),/,
  );
  assert.match(revalidateRoute, /if \(!reconnect\.success\) \{/);
  assert.match(revalidateRoute, /message: reconnect\.message/);
  assert.match(revalidateRoute, /existing = reconnect\.account;/);
  assert.match(revalidateRoute, /const reconnectValidation = rithmicReconnectValidationStore\.get\(existing\.id\);/);
  assert.match(revalidateRoute, /const readiness = buildRithmicReadiness\(/);
  assert.match(
    revalidateRoute,
    /rithmicInstances\.forUser\(req\.session\.userId\)\.get\(existing\.rithmicUsername\)/,
  );
  assert.match(revalidateRoute, /message: "Rithmic readiness revalidated successfully\."/);
  assert.match(revalidateRoute, /operationalLogger\.error\("rithmic\.readiness_revalidate_failed"/);
  assert.match(revalidateRoute, /message: "Failed to revalidate Rithmic readiness"/);
});
