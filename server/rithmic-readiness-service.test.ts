import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";

import { buildRithmicReadiness } from "./rithmic-readiness-service";

function createAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: overrides.id ?? "acct-1",
    userId: overrides.userId ?? "user-1",
    name: overrides.name ?? "Rithmic Main",
    platform: overrides.platform ?? "Rithmic",
    accountType: overrides.accountType ?? "follower",
    tradovateUsername: overrides.tradovateUsername ?? null,
    tradovateAccountId: overrides.tradovateAccountId ?? null,
    tradovateEnvironment: overrides.tradovateEnvironment ?? null,
    tradeifyUsername: overrides.tradeifyUsername ?? null,
    tradeifyAccountId: overrides.tradeifyAccountId ?? null,
    tradeifyApiKey: overrides.tradeifyApiKey ?? null,
    rithmicUsername: overrides.rithmicUsername !== undefined ? overrides.rithmicUsername : "rith-user",
    rithmicAccountId: overrides.rithmicAccountId !== undefined ? overrides.rithmicAccountId : "R-1",
    rithmicPassword: overrides.rithmicPassword !== undefined ? overrides.rithmicPassword : "secret",
    rithmicEnvironment: overrides.rithmicEnvironment !== undefined ? overrides.rithmicEnvironment : "test",
    rithmicSystemName: overrides.rithmicSystemName !== undefined ? overrides.rithmicSystemName : "Rithmic Test",
    rithmicExchange: overrides.rithmicExchange !== undefined ? overrides.rithmicExchange : "CME",
    apiKey: overrides.apiKey ?? null,
    apiSecret: overrides.apiSecret ?? null,
    isConnected: overrides.isConnected ?? true,
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

test("buildRithmicReadiness reports a ready account with conformance metadata", () => {
  const result = buildRithmicReadiness(createAccount(), {
    isAuthenticated: () => true,
    getLastLoginMetadata: () => ({
      uniqueUserId: "USER-7",
      fcmId: "FCM-1",
      ibId: "IB-1",
      timestamp: "2026-08-12T16:00:00.000Z",
      timezone: "America/New_York",
    }),
  }, {
    validatedAt: "2026-08-12T16:05:00.000Z",
    source: "saved_connect",
  });

  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.conformance?.uniqueUserIds, ["USER-7"]);
  assert.equal(result.loginMetadata?.fcmId, "FCM-1");
  assert.equal(result.reconnectValidated, true);
});

test("buildRithmicReadiness surfaces blockers when saved details or session data are missing", () => {
  const result = buildRithmicReadiness(
    createAccount({
      rithmicUsername: null,
      rithmicPassword: null,
      rithmicAccountId: null,
      rithmicSystemName: null,
    }),
    {
      isAuthenticated: () => false,
      getLastLoginMetadata: () => undefined,
    },
  );

  assert.equal(result.ready, false);
  assert.equal(result.status, "action_required");
  assert.equal(result.hasExplicitSystemName, false);
  assert.equal(result.systemName, "Rithmic Test");
  assert.deepEqual(result.blockers, [
    "Saved Rithmic username or password is missing.",
    "Saved Rithmic account ID is missing.",
    "Rithmic session is not connected.",
    "Rithmic login metadata has not been captured in the active session.",
    "Saved reconnect has not been re-validated since the last server start.",
  ]);
});
