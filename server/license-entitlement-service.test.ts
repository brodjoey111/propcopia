import assert from "node:assert/strict";
import test from "node:test";
import { BILLING_PLANS, type LicenseSnapshot } from "@shared/billing";
import { evaluateAccountEntitlement } from "./license-entitlement-service";

function license(overrides: Partial<LicenseSnapshot> = {}): LicenseSnapshot {
  return {
    plan: BILLING_PLANS.starter,
    status: "active",
    accessAllowed: true,
    enforcementEnabled: true,
    source: "stripe",
    currentPeriodEnd: null,
    ...overrides,
  };
}

test("development access remains unrestricted", () => {
  assert.deepEqual(evaluateAccountEntitlement({
    license: license({
      plan: BILLING_PLANS.development,
      enforcementEnabled: false,
      source: "development",
    }),
    accounts: Array.from({ length: 20 }, (_, index) => ({ id: String(index), accountType: "master" })),
    requestedType: "master",
  }), { allowed: true });
});

test("inactive Stripe licenses cannot add accounts", () => {
  const decision = evaluateAccountEntitlement({
    license: license({ status: "canceled", accessAllowed: false }),
    accounts: [],
    requestedType: "follower",
  });

  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.code, "LICENSE_INACTIVE");
});

test("Starter limits master and follower account counts independently", () => {
  const accounts = [
    { id: "master-1", accountType: "master" },
    { id: "follower-1", accountType: "follower" },
    { id: "follower-2", accountType: "follower" },
    { id: "follower-3", accountType: "follower" },
  ];

  const master = evaluateAccountEntitlement({ license: license(), accounts, requestedType: "master" });
  const follower = evaluateAccountEntitlement({ license: license(), accounts, requestedType: "follower" });

  assert.deepEqual(master, {
    allowed: false,
    code: "ACCOUNT_LIMIT_REACHED",
    message: "Starter allows 1 master account. Upgrade the plan or remove an existing master account first.",
    current: 1,
    limit: 1,
  });
  assert.equal(follower.allowed, false);
});

test("account-type changes exclude the account being changed", () => {
  const decision = evaluateAccountEntitlement({
    license: license(),
    accounts: [{ id: "account-1", accountType: "master" }],
    requestedType: "master",
    excludeAccountId: "account-1",
  });

  assert.deepEqual(decision, { allowed: true });
});
