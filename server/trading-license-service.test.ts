import assert from "node:assert/strict";
import test from "node:test";
import { BILLING_PLANS, type LicenseSnapshot, type LicenseStatus } from "@shared/billing";
import { evaluateTradingLicense } from "./license-entitlement-service";

function license(status: LicenseStatus, source: "development" | "stripe"): LicenseSnapshot {
  return {
    plan: source === "development" ? BILLING_PLANS.development : BILLING_PLANS.starter,
    status,
    accessAllowed: source === "development" || status === "active" || status === "trialing",
    enforcementEnabled: source === "stripe",
    source,
    currentPeriodEnd: null,
  };
}

test("development access can start trade copying without Stripe", () => {
  assert.deepEqual(evaluateTradingLicense(license("active", "development")), { allowed: true });
});

test("active and trialing Stripe licenses can start trade copying", () => {
  assert.deepEqual(evaluateTradingLicense(license("active", "stripe")), { allowed: true });
  assert.deepEqual(evaluateTradingLicense(license("trialing", "stripe")), { allowed: true });
});

for (const status of ["past_due", "canceled", "inactive"] as const) {
  test(`${status} Stripe licenses cannot start trade copying`, () => {
    assert.deepEqual(evaluateTradingLicense(license(status, "stripe")), {
      allowed: false,
      code: "LICENSE_INACTIVE",
      message: "Your subscription is not active. Restore billing access before starting or resuming trade copying.",
    });
  });
}
