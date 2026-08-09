import assert from "node:assert/strict";
import test from "node:test";

import { buildAccountBalanceMetricsById } from "./account-live-metrics";

test("buildAccountBalanceMetricsById marks live balances as usable broker data", () => {
  const metrics = buildAccountBalanceMetricsById([
    {
      accountId: "acct-1",
      userId: "user-1",
      name: "Primary",
      platform: "Tradovate",
      accountType: "master",
      brokerAccountId: "T-123",
      status: "LIVE",
      balance: 12500.5,
      equity: 12775.25,
      currency: "USD",
      capturedAt: "2026-08-04T12:00:00.000Z",
    },
  ]);

  assert.deepEqual(metrics["acct-1"], {
    hasLiveBrokerData: true,
    status: "LIVE",
    reason: undefined,
    balance: 12500.5,
    equity: 12775.25,
    currency: "USD",
  });
});

test("buildAccountBalanceMetricsById preserves disconnected states without inventing a balance", () => {
  const metrics = buildAccountBalanceMetricsById([
    {
      accountId: "acct-2",
      userId: "user-1",
      name: "Secondary",
      platform: "Rithmic",
      accountType: "follower",
      brokerAccountId: "R-500",
      status: "DISCONNECTED",
      reason: "Rithmic session is not active.",
      capturedAt: "2026-08-04T12:00:00.000Z",
    },
  ]);

  assert.deepEqual(metrics["acct-2"], {
    hasLiveBrokerData: false,
    status: "DISCONNECTED",
    reason: "Rithmic session is not active.",
    balance: undefined,
    equity: undefined,
    currency: undefined,
  });
});
