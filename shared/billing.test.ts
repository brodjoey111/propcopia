import assert from "node:assert/strict";
import test from "node:test";
import { BILLING_PLANS } from "./billing.ts";

test("billing catalog defines stable prices and account limits", () => {
  assert.equal(BILLING_PLANS.starter.monthlyPriceUsd, 49);
  assert.equal(BILLING_PLANS.starter.entitlements.maxFollowerAccounts, 3);
  assert.equal(BILLING_PLANS.professional.monthlyPriceUsd, 149);
  assert.equal(BILLING_PLANS.professional.entitlements.maxFollowerAccounts, 10);
  assert.equal(BILLING_PLANS.enterprise.monthlyPriceUsd, 399);
  assert.equal(BILLING_PLANS.enterprise.entitlements.maxFollowerAccounts, null);
});

test("development access remains unrestricted before paid enforcement", () => {
  assert.equal(BILLING_PLANS.development.monthlyPriceUsd, null);
  assert.equal(BILLING_PLANS.development.entitlements.maxMasterAccounts, null);
  assert.equal(BILLING_PLANS.development.entitlements.maxFollowerAccounts, null);
});
