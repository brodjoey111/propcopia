import test from "node:test";
import assert from "node:assert/strict";

import type { Account } from "@shared/schema";

import {
  buildRithmicReadinessViewItems,
  getRithmicAccounts,
  getRithmicReadinessBannerLabel,
  getRithmicReadinessBannerToneClass,
  summarizeRithmicReadiness,
  type RithmicAccountReadiness,
} from "./rithmic-readiness";

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

test("getRithmicAccounts returns only saved Rithmic accounts", () => {
  const result = getRithmicAccounts([
    createAccount({ id: "trad-1", platform: "Tradovate" }),
    createAccount({ id: "rith-1", platform: "Rithmic" }),
    createAccount({ id: "tradeify-1", platform: "Tradeify" }),
  ]);

  assert.deepEqual(result.map((account) => account.id), ["rith-1"]);
});

test("summarizeRithmicReadiness counts ready, connected, and missing metadata states", () => {
  const items: RithmicAccountReadiness[] = [
    {
      accountId: "rith-1",
      accountName: "Ready",
      status: "ready",
      ready: true,
      environment: "test",
      systemName: "Rithmic Test",
      hasExplicitSystemName: true,
      exchange: "CME",
      savedBrokerUsername: "user-1",
      hasSavedCredentials: true,
      hasSavedAccountId: true,
      sessionActive: true,
      reconnectValidated: true,
      reconnectValidation: {
        validatedAt: "2026-08-12T16:05:00.000Z",
        source: "saved_connect",
      },
      loginMetadata: {
        uniqueUserId: "USER-1",
        fcmId: "FCM-1",
        ibId: "IB-1",
        timestamp: "2026-08-12T16:00:00.000Z",
        timezone: "America/New_York",
      },
      blockers: [],
    },
    {
      accountId: "rith-2",
      accountName: "Blocked",
      status: "action_required",
      ready: false,
      environment: "test",
      systemName: "Rithmic Test",
      hasExplicitSystemName: false,
      exchange: null,
      savedBrokerUsername: null,
      hasSavedCredentials: false,
      hasSavedAccountId: false,
      sessionActive: false,
      reconnectValidated: false,
      blockers: ["Missing credentials"],
    },
  ];

  assert.deepEqual(summarizeRithmicReadiness(items), {
    total: 2,
    readyCount: 1,
    actionRequiredCount: 1,
    connectedSessionCount: 1,
    offlineSessionCount: 1,
    missingMetadataCount: 1,
    reconnectValidatedCount: 1,
    needsReconnectProofCount: 1,
  });
});

test("buildRithmicReadinessViewItems prioritizes reconnect proof gaps and formats reconnect labels", () => {
  const items = buildRithmicReadinessViewItems([
    {
      accountId: "rith-1",
      accountName: "Ready Account",
      status: "ready",
      ready: true,
      environment: "test",
      systemName: "Rithmic Test",
      hasExplicitSystemName: true,
      exchange: "CME",
      savedBrokerUsername: "user-1",
      hasSavedCredentials: true,
      hasSavedAccountId: true,
      sessionActive: true,
      reconnectValidated: true,
      reconnectValidation: {
        validatedAt: "2026-08-12T16:05:00.000Z",
        source: "saved_connect",
      },
      loginMetadata: {
        uniqueUserId: "USER-1",
        fcmId: "FCM-1",
        ibId: "IB-1",
        timestamp: "2026-08-12T16:00:00.000Z",
        timezone: "America/New_York",
      },
      blockers: [],
    },
    {
      accountId: "rith-2",
      accountName: "Reconnect Needed",
      status: "action_required",
      ready: false,
      environment: "test",
      systemName: "Rithmic Test",
      hasExplicitSystemName: false,
      exchange: null,
      savedBrokerUsername: "user-2",
      hasSavedCredentials: true,
      hasSavedAccountId: true,
      sessionActive: false,
      reconnectValidated: false,
      blockers: ["Reconnect proof missing", "Login metadata missing"],
    },
  ]);

  assert.equal(items[0]?.accountId, "rith-2");
  assert.equal(items[0]?.statusLabel, "Reconnect proof needed");
  assert.equal(items[0]?.reconnectBadgeLabel, "Reconnect proof needed");
  assert.equal(items[0]?.reconnectBadgeTone, "warn");
  assert.equal(
    items[0]?.sessionLabel,
    "Session offline. Reconnect this account to capture fresh login evidence.",
  );
  assert.equal(
    items[0]?.reconnectLabel,
    "Reconnect proof missing on this server run.",
  );
  assert.deepEqual(items[0]?.blockerPreview, [
    "Reconnect proof missing",
    "Login metadata missing",
  ]);
  assert.equal(items[1]?.accountId, "rith-1");
  assert.equal(items[1]?.reconnectBadgeTone, "ok");
  assert.match(items[1]?.reconnectLabel ?? "", /Reconnect proof captured/);
});

test("rithmic readiness banner helpers return compact overview copy", () => {
  assert.equal(getRithmicReadinessBannerLabel({ total: 0, readyCount: 0, actionRequiredCount: 0 }), "No Rithmic accounts saved");
  assert.equal(getRithmicReadinessBannerLabel({ total: 2, readyCount: 2, actionRequiredCount: 0 }), "Rithmic accounts are ready");
  assert.equal(getRithmicReadinessBannerLabel({ total: 3, readyCount: 1, actionRequiredCount: 2 }), "1/3 Rithmic accounts ready");
  assert.match(getRithmicReadinessBannerToneClass(0), /emerald/);
  assert.match(getRithmicReadinessBannerToneClass(2), /amber/);
});
