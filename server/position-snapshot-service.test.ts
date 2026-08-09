import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";
import { buildPositionSnapshots } from "./position-snapshot-service";

function createAccount(overrides: Partial<Account>): Account {
  return {
    id: overrides.id ?? "acct-1",
    userId: overrides.userId ?? "user-1",
    name: overrides.name ?? "Primary",
    platform: overrides.platform ?? "Tradovate",
    accountType: overrides.accountType ?? "follower",
    tradovateUsername: overrides.tradovateUsername ?? null,
    tradovateAccountId: overrides.tradovateAccountId ?? null,
    tradovateEnvironment: overrides.tradovateEnvironment ?? null,
    tradeifyUsername: overrides.tradeifyUsername ?? null,
    tradeifyAccountId: overrides.tradeifyAccountId ?? null,
    tradeifyApiKey: overrides.tradeifyApiKey ?? null,
    rithmicUsername: overrides.rithmicUsername ?? null,
    rithmicAccountId: overrides.rithmicAccountId ?? null,
    rithmicPassword: overrides.rithmicPassword ?? null,
    rithmicEnvironment: overrides.rithmicEnvironment ?? null,
    rithmicSystemName: overrides.rithmicSystemName ?? null,
    rithmicExchange: overrides.rithmicExchange ?? null,
    apiKey: overrides.apiKey ?? null,
    apiSecret: overrides.apiSecret ?? null,
    isConnected: overrides.isConnected ?? false,
    balance: overrides.balance ?? null,
    openPositions: overrides.openPositions ?? 0,
    pnl: overrides.pnl ?? "0",
    riskMode: overrides.riskMode ?? "global",
    positionScaling: overrides.positionScaling ?? 100,
    copySizingMode: overrides.copySizingMode ?? "MULTIPLIER",
    fixedQuantity: overrides.fixedQuantity ?? null,
    reverseCopying: overrides.reverseCopying ?? false,
    maxContracts: overrides.maxContracts ?? null,
    maxOpenPositions: overrides.maxOpenPositions ?? null,
    allowedDirections: overrides.allowedDirections ?? "both",
    maxDailyLoss: overrides.maxDailyLoss ?? null,
    maxDailyLossPct: overrides.maxDailyLossPct ?? null,
    maxWeeklyLoss: overrides.maxWeeklyLoss ?? null,
    maxWeeklyLossPct: overrides.maxWeeklyLossPct ?? null,
    maxDrawdownPct: overrides.maxDrawdownPct ?? null,
    maxConsecutiveLosses: overrides.maxConsecutiveLosses ?? null,
    blockedTickers: overrides.blockedTickers ?? null,
    allowedTickers: overrides.allowedTickers ?? null,
    maxTradesPerDay: overrides.maxTradesPerDay ?? null,
    minAccountBalance: overrides.minAccountBalance ?? null,
    tradingStartTime: overrides.tradingStartTime ?? null,
    tradingEndTime: overrides.tradingEndTime ?? null,
    tradingDays: overrides.tradingDays ?? null,
    cooldownAfterLoss: overrides.cooldownAfterLoss ?? null,
    onBreachAction: overrides.onBreachAction ?? "pause",
    lastSync: overrides.lastSync ?? null,
  };
}

test("buildPositionSnapshots normalizes live Tradovate and Tradeify positions", async () => {
  const result = await buildPositionSnapshots(
    [
      createAccount({
        id: "trad-1",
        name: "Trad Follower",
        platform: "Tradovate",
        tradovateUsername: "trad-user",
        tradovateAccountId: "T-123",
      }),
      createAccount({
        id: "tradeify-1",
        name: "Tradeify Follower",
        platform: "Tradeify",
        tradeifyUsername: "tradeify-user",
        tradeifyAccountId: "PX-55",
      }),
    ],
    {
      tradovateInstances: new Map([
        [
          "trad-user",
          {
            isTokenValid: () => true,
            async getPositions() {
              return [
                {
                  accountId: "T-123",
                  symbol: "ESU6",
                  netPos: 2,
                  avgPrice: 6402.75,
                  openPnl: 120.5,
                },
              ];
            },
          },
        ],
      ]),
      tradeifyInstances: new Map([
        [
          "tradeify-user",
          {
            async getPositions() {
              return [
                {
                  symbol: "NQU6",
                  quantity: -1,
                  entryPrice: 19842.25,
                  unrealizedPnL: -85.25,
                },
              ];
            },
          },
        ],
      ]),
    },
  );

  assert.equal(result.summary.totalAccounts, 2);
  assert.equal(result.summary.liveAccounts, 2);
  assert.equal(result.summary.totalOpenPositions, 2);
  assert.deepEqual(
    result.accounts.map((account) => ({
      id: account.accountId,
      status: account.status,
      positions: account.positions.map((position) => ({
        symbol: position.symbol,
        side: position.side,
        quantity: position.quantity,
      })),
    })),
    [
      {
        id: "trad-1",
        status: "LIVE",
        positions: [{ symbol: "ESU6", side: "LONG", quantity: 2 }],
      },
      {
        id: "tradeify-1",
        status: "LIVE",
        positions: [{ symbol: "NQU6", side: "SHORT", quantity: -1 }],
      },
    ],
  );
});

test("buildPositionSnapshots marks disconnected, unavailable, and error states", async () => {
  const result = await buildPositionSnapshots(
    [
      createAccount({
        id: "trad-disconnected",
        platform: "Tradovate",
        tradovateUsername: "missing-session",
      }),
      createAccount({
        id: "rithmic-1",
        platform: "Rithmic",
        rithmicUsername: "r-user",
        rithmicAccountId: "R-1",
      }),
      createAccount({
        id: "tradeify-error",
        platform: "Tradeify",
        tradeifyUsername: "tradeify-error",
        tradeifyAccountId: "PX-99",
      }),
    ],
    {
      tradovateInstances: new Map(),
      tradeifyInstances: new Map([
        [
          "tradeify-error",
          {
            async getPositions() {
              throw new Error("Position endpoint unavailable");
            },
          },
        ],
      ]),
    },
  );

  assert.equal(result.summary.disconnectedAccounts, 1);
  assert.equal(result.summary.unavailableAccounts, 1);
  assert.equal(result.summary.errorAccounts, 1);
  assert.deepEqual(
    result.accounts.map((account) => ({
      id: account.accountId,
      status: account.status,
      reason: account.reason,
    })),
    [
      {
        id: "trad-disconnected",
        status: "DISCONNECTED",
        reason: "Tradovate session is not active.",
      },
      {
        id: "rithmic-1",
        status: "UNAVAILABLE",
        reason: "Rithmic position snapshots are not implemented yet.",
      },
      {
        id: "tradeify-error",
        status: "ERROR",
        reason: "Position endpoint unavailable",
      },
    ],
  );
});
