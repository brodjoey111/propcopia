import assert from "node:assert/strict";
import test from "node:test";
import { buildLicenseSnapshot } from "./license-service.ts";

test("missing license data safely resolves to unrestricted development access", () => {
  assert.deepEqual(buildLicenseSnapshot({}), {
    plan: {
      id: "development",
      name: "Development Access",
      monthlyPriceUsd: null,
      entitlements: {
        maxMasterAccounts: null,
        maxFollowerAccounts: null,
        tradeHistory: true,
        advancedAnalytics: true,
        apiAccess: true,
      },
    },
    status: "active",
    accessAllowed: true,
    enforcementEnabled: false,
    source: "development",
    currentPeriodEnd: null,
  });
});

test("Stripe-backed states report access honestly without enabling enforcement", () => {
  const active = buildLicenseSnapshot({
    licensePlan: "professional",
    licenseStatus: "trialing",
    stripeCustomerId: "cus_private",
    licenseCurrentPeriodEnd: "2026-09-01T12:00:00.000Z",
  });
  const canceled = buildLicenseSnapshot({
    licensePlan: "starter",
    licenseStatus: "canceled",
    stripeCustomerId: "cus_private",
  });

  assert.equal(active.source, "stripe");
  assert.equal(active.accessAllowed, true);
  assert.equal(active.enforcementEnabled, false);
  assert.equal(active.currentPeriodEnd, "2026-09-01T12:00:00.000Z");
  assert.equal(canceled.accessAllowed, false);
  assert.equal(JSON.stringify(active).includes("cus_private"), false);
});

test("unknown external values fall back without throwing", () => {
  const result = buildLicenseSnapshot({
    licensePlan: "unknown-plan",
    licenseStatus: "unknown-status",
    licenseCurrentPeriodEnd: "not-a-date",
  });

  assert.equal(result.plan.id, "development");
  assert.equal(result.status, "active");
  assert.equal(result.currentPeriodEnd, null);
});
