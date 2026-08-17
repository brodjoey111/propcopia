import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";

import { prepareAccountRuntimeViewModels } from "./account-runtime-view";

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
    balance: overrides.balance ?? "2500.00",
    openPositions: overrides.openPositions ?? 1,
    pnl: overrides.pnl ?? "40.50",
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

test("prepareAccountRuntimeViewModels prefers live balance and position data when available", () => {
  const [viewModel] = prepareAccountRuntimeViewModels({
    accounts: [createAccount({ id: "acct-live" })],
    positionMetricsById: {
      "acct-live": {
        hasLiveBrokerData: true,
        status: "LIVE",
        reason: undefined,
        openPositions: 3,
        unrealizedPnl: 125.75,
      },
    },
    balanceMetricsById: {
      "acct-live": {
        hasLiveBrokerData: true,
        status: "LIVE",
        reason: undefined,
        balance: 5600.25,
        equity: 5700,
        currency: "USD",
      },
    },
    getSessionStatus: () => ({ label: "copy ready", tone: "ok" }),
  });

  assert.equal(viewModel.balance, 5600.25);
  assert.equal(viewModel.pnl, 125.75);
  assert.equal(viewModel.openPositions, 3);
  assert.equal(viewModel.hasLiveBalance, true);
  assert.equal(viewModel.hasLivePositionData, true);
  assert.equal(viewModel.hasLiveBrokerData, true);
  assert.equal(viewModel.liveBrokerStatus, "LIVE");
  assert.equal(viewModel.sessionStatus.label, "copy ready");
});

test("prepareAccountRuntimeViewModels falls back to saved account values when live data is unavailable", () => {
  const [viewModel] = prepareAccountRuntimeViewModels({
    accounts: [createAccount({ id: "acct-saved", balance: "1800.50", pnl: "-10.25", openPositions: 2 })],
    positionMetricsById: {},
    balanceMetricsById: {},
    getSessionStatus: () => ({ tone: "neutral" }),
  });

  assert.equal(viewModel.balance, 1800.5);
  assert.equal(viewModel.pnl, -10.25);
  assert.equal(viewModel.openPositions, 2);
  assert.equal(viewModel.hasLiveBalance, false);
  assert.equal(viewModel.hasLivePositionData, false);
  assert.equal(viewModel.hasLiveBrokerData, false);
  assert.equal(viewModel.liveBrokerStatus, "NONE");
});

test("prepareAccountRuntimeViewModels keeps metric sources separate when only balance is live", () => {
  const [viewModel] = prepareAccountRuntimeViewModels({
    accounts: [createAccount({ id: "acct-partial", balance: "1800.50", pnl: "45.25", openPositions: 2 })],
    positionMetricsById: {},
    balanceMetricsById: {
      "acct-partial": {
        hasLiveBrokerData: true,
        status: "LIVE",
        balance: 7200.25,
      },
    },
    getSessionStatus: () => ({ tone: "neutral" }),
  });

  assert.equal(viewModel.balance, 7200.25);
  assert.equal(viewModel.pnl, 45.25);
  assert.equal(viewModel.openPositions, 2);
  assert.equal(viewModel.hasLiveBalance, true);
  assert.equal(viewModel.hasLivePositionData, false);
  assert.equal(viewModel.hasLiveBrokerData, true);
});
