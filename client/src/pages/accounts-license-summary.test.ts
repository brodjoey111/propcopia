import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./accounts.tsx", import.meta.url), "utf8");

test("accounts page loads billing status only for an authenticated user", () => {
  assert.match(source, /queryKey: \['\/api\/billing\/status'\]/);
  assert.match(source, /enabled: !!authData\?\.user\?\.id/);
});

test("accounts page summarizes server-owned licensing with local account counts", () => {
  assert.match(source, /buildLicenseSummary\(billingStatusData\.license/);
  assert.match(source, /account\.accountType === 'master'/);
  assert.match(source, /account\.accountType === 'follower'/);
  assert.match(source, /data-testid="account-license-summary"/);
});
