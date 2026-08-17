import assert from "node:assert/strict";
import test from "node:test";
import { BILLING_PLANS, type LicenseSnapshot } from "@shared/billing";
import { buildLicenseSummary } from "./license-summary";

function snapshot(input: Partial<LicenseSnapshot> = {}): LicenseSnapshot {
  return {
    plan: BILLING_PLANS.development,
    status: "active",
    accessAllowed: true,
    enforcementEnabled: false,
    source: "development",
    currentPeriodEnd: null,
    ...input,
  };
}

test("development access is described as active and unrestricted", () => {
  const summary = buildLicenseSummary(snapshot(), { masterAccounts: 4, followerAccounts: 20 });
  assert.equal(summary.title, "Development Access - active");
  assert.match(summary.detail, /unrestricted/);
  assert.equal(summary.tone, "neutral");
});

test("paid plans show current master and follower capacity", () => {
  const summary = buildLicenseSummary(snapshot({
    plan: BILLING_PLANS.starter,
    enforcementEnabled: true,
    source: "stripe",
  }), { masterAccounts: 1, followerAccounts: 2 });
  assert.match(summary.detail, /Master accounts: 1 \/ 1/);
  assert.match(summary.detail, /Follower accounts: 2 \/ 3/);
  assert.equal(summary.tone, "warn");
});

test("inactive licenses explain locked actions and retained safety controls", () => {
  const summary = buildLicenseSummary(snapshot({
    plan: BILLING_PLANS.professional,
    status: "past_due",
    accessAllowed: false,
    enforcementEnabled: true,
    source: "stripe",
  }), { masterAccounts: 1, followerAccounts: 4 });
  assert.match(summary.title, /action required/);
  assert.match(summary.detail, /Safety controls remain available/);
  assert.equal(summary.tone, "danger");
});

test("unlimited paid plans use an explicit unlimited label", () => {
  const summary = buildLicenseSummary(snapshot({
    plan: BILLING_PLANS.enterprise,
    enforcementEnabled: true,
    source: "stripe",
  }), { masterAccounts: 3, followerAccounts: 12 });
  assert.match(summary.detail, /3 \/ unlimited/);
  assert.match(summary.detail, /12 \/ unlimited/);
});
