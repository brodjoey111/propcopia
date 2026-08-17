import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";

import {
  buildAccountRiskOverview,
  evaluateAccountRisk,
} from "./account-risk-service";

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
    balance: overrides.balance ?? "50000",
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

test("evaluateAccountRisk marks accounts breached when hard limits are exceeded", () => {
  const result = evaluateAccountRisk({
    account: createAccount({
      id: "acct-breached",
      pnl: "-1250",
      maxDailyLoss: "1000",
      maxOpenPositions: 2,
      onBreachAction: "close_and_pause",
    }),
    liveAccount: {
      accountId: "acct-breached",
      userId: "user-1",
      name: "Breached",
      platform: "Tradovate",
      accountType: "follower",
      status: "LIVE",
      balance: 50000,
      equity: 48750,
      currency: "USD",
      capturedAt: "2026-08-11T12:00:00.000Z",
    },
    positionSnapshot: {
      accountId: "acct-breached",
      userId: "user-1",
      name: "Breached",
      platform: "Tradovate",
      accountType: "follower",
      status: "LIVE",
      positions: [
        { symbol: "ESU6", quantity: 1, side: "LONG" },
        { symbol: "NQU6", quantity: 1, side: "LONG" },
      ],
      openPositionCount: 2,
      capturedAt: "2026-08-11T12:00:00.000Z",
    },
  });

  assert.equal(result.status, "BREACHED");
  assert.equal(result.action, "close_and_pause");
  assert.equal(result.breachCount, 2);
  assert.equal(result.warningCount, 0);
});

test("evaluateAccountRisk marks accounts warn when nearing configured limits", () => {
  const result = evaluateAccountRisk({
    account: createAccount({
      id: "acct-warn",
      pnl: "-850",
      maxDailyLoss: "1000",
    }),
    liveAccount: {
      accountId: "acct-warn",
      userId: "user-1",
      name: "Warn",
      platform: "Tradovate",
      accountType: "follower",
      status: "LIVE",
      balance: 50000,
      equity: 49150,
      currency: "USD",
      capturedAt: "2026-08-11T12:00:00.000Z",
    },
  });

  assert.equal(result.status, "WARN");
  assert.equal(result.breachCount, 0);
  assert.equal(result.warningCount, 1);
  assert.equal(result.rules[0]?.status, "WARN");
});

test("evaluateAccountRisk evaluates weekly loss, drawdown, and loss streak metrics", () => {
  const result = evaluateAccountRisk({
    account: createAccount({
      id: "acct-expanded-risk",
      balance: "45000",
      maxWeeklyLoss: "2000",
      maxWeeklyLossPct: "4",
      maxDrawdownPct: "8",
      maxConsecutiveLosses: 3,
    }),
    riskMetrics: {
      weeklyPnl: -2100,
      peakBalance: 50000,
      consecutiveLosses: 3,
    },
  });

  assert.equal(result.status, "BREACHED");
  assert.deepEqual(
    result.rules.map((rule) => [rule.code, rule.status]),
    [
      ["MAX_WEEKLY_LOSS", "BREACHED"],
      ["MAX_WEEKLY_LOSS_PCT", "BREACHED"],
      ["MAX_DRAWDOWN_PCT", "BREACHED"],
      ["MAX_CONSECUTIVE_LOSSES", "BREACHED"],
    ],
  );
});

test("evaluateAccountRisk reports configured rules unavailable when metrics are missing", () => {
  const result = evaluateAccountRisk({
    account: createAccount({
      id: "acct-missing-risk-data",
      maxDailyLoss: "1000",
      maxWeeklyLoss: "3000",
      maxDrawdownPct: "10",
    }),
  });

  assert.equal(result.status, "UNAVAILABLE");
  assert.deepEqual(
    result.rules.map((rule) => [rule.code, rule.status]),
    [
      ["MAX_DAILY_LOSS", "OK"],
      ["MAX_WEEKLY_LOSS", "UNAVAILABLE"],
      ["MAX_DRAWDOWN_PCT", "UNAVAILABLE"],
    ],
  );
});

test("unavailable configured data takes precedence over a warning so preflight fails closed", () => {
  const result = evaluateAccountRisk({
    account: createAccount({
      id: "acct-warning-and-missing",
      pnl: "-850",
      maxDailyLoss: "1000",
      maxWeeklyLoss: "3000",
    }),
  });

  assert.equal(result.warningCount, 1);
  assert.equal(result.status, "UNAVAILABLE");
});

test("daily loss percentage is unavailable when a loss has no usable balance", () => {
  const result = evaluateAccountRisk({
    account: createAccount({
      id: "acct-no-balance",
      balance: "",
      pnl: "-250",
      maxDailyLossPct: "2",
    }),
  });

  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.rules[0]?.status, "UNAVAILABLE");
});

test("buildAccountRiskOverview summarizes mixed account states", () => {
  const result = buildAccountRiskOverview({
    accounts: [
      createAccount({ id: "acct-safe", maxDailyLoss: "1000", pnl: "-200" }),
      createAccount({ id: "acct-breached", maxDailyLoss: "1000", pnl: "-1200" }),
      createAccount({ id: "acct-unavailable", minAccountBalance: "25000" }),
    ],
    liveAccounts: [
      {
        accountId: "acct-safe",
        userId: "user-1",
        name: "Safe",
        platform: "Tradovate",
        accountType: "follower",
        status: "LIVE",
        balance: 50000,
        equity: 49800,
        currency: "USD",
        capturedAt: "2026-08-11T12:00:00.000Z",
      },
      {
        accountId: "acct-breached",
        userId: "user-1",
        name: "Breached",
        platform: "Tradovate",
        accountType: "follower",
        status: "LIVE",
        balance: 50000,
        equity: 48800,
        currency: "USD",
        capturedAt: "2026-08-11T12:00:00.000Z",
      },
    ],
    positionSnapshots: [],
  });

  assert.deepEqual(result.summary, {
    totalAccounts: 3,
    breachedAccounts: 1,
    warningAccounts: 0,
    unavailableAccounts: 0,
    safeAccounts: 2,
  });
});
