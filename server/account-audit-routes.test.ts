import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("account lifecycle routes emit structured audit events after successful mutations", () => {
  for (const event of ["created", "connected", "disconnected", "removed", "renamed", "role_changed"]) {
    assert.match(routesSource, new RegExp(`logAccountAuditEvent\\(\\"${event}\\"`));
  }
});

test("account lifecycle audit calls do not pass request bodies or credential fields", () => {
  const calls = routesSource.match(/logAccountAuditEvent\([\s\S]*?\n\s*\}\);/g) ?? [];
  assert.equal(calls.length, 6);
  for (const call of calls) {
    assert.doesNotMatch(call, /req\.body|password|username|apiKey|apiSecret|credential/i);
  }
});

test("role changes are audited only by the account-type route", () => {
  const brokerSettingsRoute = routesSource.slice(
    routesSource.indexOf('app.patch("/api/accounts/:id/broker-settings"'),
    routesSource.indexOf('app.patch("/api/accounts/:id/account-type"'),
  );
  const accountTypeRoute = routesSource.slice(
    routesSource.indexOf('app.patch("/api/accounts/:id/account-type"'),
    routesSource.indexOf('app.patch("/api/accounts/:id/risk-settings"'),
  );

  assert.doesNotMatch(brokerSettingsRoute, /account\.role_changed|"role_changed"/);
  assert.match(accountTypeRoute, /logAccountAuditEvent\("role_changed"/);
});
