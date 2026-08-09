import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAccountLiveMetricsById,
  toDashboardPositionRows,
  type AccountPositionSnapshot,
} from "./positions";

function createAccount(overrides: Partial<AccountPositionSnapshot>): AccountPositionSnapshot {
  return {
    accountId: overrides.accountId ?? "acct-1",
    userId: overrides.userId ?? "user-1",
    name: overrides.name ?? "Primary",
    platform: overrides.platform ?? "Tradovate",
    accountType: overrides.accountType ?? "follower",
    brokerAccountId: overrides.brokerAccountId,
    status: overrides.status ?? "LIVE",
    reason: overrides.reason,
    positions: overrides.positions ?? [],
    openPositionCount: overrides.openPositionCount ?? 0,
    capturedAt: overrides.capturedAt ?? "2026-08-04T12:00:00.000Z",
  };
}

test("toDashboardPositionRows flattens live positions and sorts by pnl magnitude", () => {
  const rows = toDashboardPositionRows([
    createAccount({
      name: "Alpha",
      positions: [
        {
          symbol: "ESU6",
          quantity: 2,
          averagePrice: 6402.75,
          side: "LONG",
          unrealizedPnl: 120.25,
        },
      ],
      openPositionCount: 1,
    }),
    createAccount({
      name: "Beta",
      positions: [
        {
          symbol: "NQU6",
          quantity: -1,
          averagePrice: 19842.25,
          side: "SHORT",
          unrealizedPnl: -240.5,
        },
      ],
      openPositionCount: 1,
    }),
  ]);

  assert.deepEqual(rows, [
    {
      symbol: "NQU6",
      side: "Short",
      size: 1,
      avg: "19,842.25",
      account: "Beta",
      pnl: -240.5,
    },
    {
      symbol: "ESU6",
      side: "Long",
      size: 2,
      avg: "6,402.75",
      account: "Alpha",
      pnl: 120.25,
    },
  ]);
});

test("toDashboardPositionRows ignores unavailable accounts and flat quantities", () => {
  const rows = toDashboardPositionRows([
    createAccount({
      status: "UNAVAILABLE",
      positions: [
        {
          symbol: "CLV6",
          quantity: 1,
          side: "LONG",
        },
      ],
    }),
    createAccount({
      status: "LIVE",
      positions: [
        {
          symbol: "GCZ6",
          quantity: 0,
          side: "FLAT",
        },
      ],
    }),
  ]);

  assert.deepEqual(rows, []);
});

test("buildAccountLiveMetricsById summarizes live and unavailable account snapshots", () => {
  const metrics = buildAccountLiveMetricsById([
    createAccount({
      accountId: "acct-live",
      status: "LIVE",
      positions: [
        {
          symbol: "ESU6",
          quantity: 2,
          side: "LONG",
          unrealizedPnl: 150.25,
        },
        {
          symbol: "NQU6",
          quantity: -1,
          side: "SHORT",
          unrealizedPnl: -25,
        },
      ],
      openPositionCount: 2,
    }),
    createAccount({
      accountId: "acct-missing",
      status: "UNAVAILABLE",
      reason: "Rithmic position snapshots are not implemented yet.",
      positions: [],
      openPositionCount: 0,
    }),
  ]);

  assert.deepEqual(metrics, {
    "acct-live": {
      hasLiveBrokerData: true,
      status: "LIVE",
      reason: undefined,
      openPositions: 2,
      unrealizedPnl: 125.25,
    },
    "acct-missing": {
      hasLiveBrokerData: false,
      status: "UNAVAILABLE",
      reason: "Rithmic position snapshots are not implemented yet.",
      openPositions: 0,
      unrealizedPnl: 0,
    },
  });
});
