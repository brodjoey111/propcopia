import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");

test("account creation enforces the signed-in user's license before insertion", () => {
  const route = source.slice(
    source.indexOf('app.post("/api/accounts"'),
    source.indexOf('app.get("/api/accounts"'),
  );
  assert.match(route, /storage\.getUser\(req\.session\.userId\)/);
  assert.match(route, /accountData\.accountType !== "master" && accountData\.accountType !== "follower"/);
  assert.match(route, /evaluateAccountEntitlement\(\{/);
  assert.match(route, /license: buildLicenseSnapshot\(user\)/);
  assert.match(route, /requestedType: accountData\.accountType/);
  assert.ok(route.indexOf("evaluateAccountEntitlement") < route.indexOf("db.insert(accounts)"));
  assert.match(route, /return res\.status\(403\)\.json\(\{ success: false, \.\.\.entitlement \}\)/);
});

test("account-type changes enforce limits without counting the edited account", () => {
  const route = source.slice(
    source.indexOf('app.patch("/api/accounts/:id/account-type"'),
    source.indexOf('app.patch("/api/accounts/:id/risk-settings"'),
  );
  assert.match(route, /existing\.accountType !== requestedAccountType/);
  assert.match(route, /evaluateAccountEntitlement\(\{/);
  assert.match(route, /excludeAccountId: existing\.id/);
  assert.ok(route.indexOf("evaluateAccountEntitlement") < route.indexOf(".update(accounts)"));
});
