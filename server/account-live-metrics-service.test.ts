import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";
import { buildAccountLiveMetrics } from "./account-live-metrics-service";

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

test("buildAccountLiveMetrics normalizes live balances across Tradovate, Tradeify, and Rithmic", async () => {
  const result = await buildAccountLiveMetrics(
    [
      createAccount({
        id: "trad-1",
        name: "Trad Main",
        platform: "Tradovate",
        tradovateUsername: "trad-user",
        tradovateAccountId: "T-123",
      }),
      createAccount({
        id: "tradeify-1",
        name: "Tradeify Main",
        platform: "Tradeify",
        tradeifyUsername: "tradeify-user",
        tradeifyAccountId: "PX-55",
      }),
      createAccount({
        id: "rithmic-1",
        name: "Rithmic Main",
        platform: "Rithmic",
        rithmicUsername: "rithmic-user",
        rithmicAccountId: "R-1",
      }),
    ],
    {
      tradovateInstances: new Map([
        [
          "trad-user",
          {
            isTokenValid: () => true,
            async getAccountInfo() {
              return [
                {
                  accountId: "T-123",
                  name: "Trad Main",
                  balance: "12500.50",
                  netLiq: "12775.25",
                  currency: "USD",
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
            async getAccounts() {
              return [
                {
                  accountId: "PX-55",
                  name: "Tradeify Main",
                  balance: 8100,
                  equity: 8350.15,
                  currency: "USD",
                },
              ];
            },
          },
        ],
      ]),
      rithmicInstances: new Map([
        [
          "rithmic-user",
          {
            async testConnection() {
              return {
                success: true,
                message: "ok",
                data: [
                  {
                    id: "R-1",
                    name: "Rithmic Main",
                    balance: 22100.75,
                    currency: "USD",
                  },
                ],
              };
            },
          },
        ],
      ]),
    },
  );

  assert.equal(result.summary.totalAccounts, 3);
  assert.equal(result.summary.liveAccounts, 3);
  assert.equal(result.summary.liveBalanceAccounts, 3);
  assert.equal(result.summary.totalLiveBalance, 42701.25);
  assert.deepEqual(
    result.accounts.map((account) => ({
      accountId: account.accountId,
      status: account.status,
      balance: account.balance,
      equity: account.equity,
    })),
    [
      {
        accountId: "trad-1",
        status: "LIVE",
        balance: 12500.5,
        equity: 12775.25,
      },
      {
        accountId: "tradeify-1",
        status: "LIVE",
        balance: 8100,
        equity: 8350.15,
      },
      {
        accountId: "rithmic-1",
        status: "LIVE",
        balance: 22100.75,
        equity: 22100.75,
      },
    ],
  );
});

test("buildAccountLiveMetrics marks disconnected, unavailable, and error states", async () => {
  const result = await buildAccountLiveMetrics(
    [
      createAccount({
        id: "trad-disconnected",
        platform: "Tradovate",
        tradovateUsername: "missing-session",
        tradovateAccountId: "T-404",
      }),
      createAccount({
        id: "tradeify-unavailable",
        name: "Tradeify Ghost",
        platform: "Tradeify",
        tradeifyUsername: "tradeify-user",
        tradeifyAccountId: "PX-99",
      }),
      createAccount({
        id: "rithmic-error",
        platform: "Rithmic",
        rithmicUsername: "rithmic-user",
        rithmicAccountId: "R-500",
      }),
    ],
    {
      tradovateInstances: new Map(),
      tradeifyInstances: new Map([
        [
          "tradeify-user",
          {
            async getAccounts() {
              return [{ accountId: "PX-55", name: "Tradeify Main", balance: 1000 }];
            },
          },
        ],
      ]),
      rithmicInstances: new Map([
        [
          "rithmic-user",
          {
            async testConnection() {
              return {
                success: false,
                message: "Saved Rithmic session could not be verified.",
              };
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
      accountId: account.accountId,
      status: account.status,
      reason: account.reason,
    })),
    [
      {
        accountId: "trad-disconnected",
        status: "DISCONNECTED",
        reason: "Tradovate session is not active.",
      },
      {
        accountId: "tradeify-unavailable",
        status: "UNAVAILABLE",
        reason: "Tradeify account was not found in the active broker session.",
      },
      {
        accountId: "rithmic-error",
        status: "ERROR",
        reason: "Saved Rithmic session could not be verified.",
      },
    ],
  );
});
