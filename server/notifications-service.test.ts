import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";
import { buildNotifications } from "./notifications-service";
import { tradeHistoryStore } from "./trade-history-store";

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

test("buildNotifications merges copy-group, trade, and position alerts", async () => {
  tradeHistoryStore.clear();
  tradeHistoryStore.start();

  try {
    (tradeHistoryStore as any).upsert("intent-1", {
      historyId: "intent-1",
      intentId: "intent-1",
      masterAccountId: "master-1",
      masterFillId: "fill-1",
      followerAccountId: "acct-1",
      symbol: "ES",
      lifecycleStatus: "FAILED",
      createdAt: "2026-08-04T12:00:00.000Z",
      updatedAt: "2026-08-04T12:00:05.000Z",
      failedAt: "2026-08-04T12:00:05.000Z",
      lastErrorMessage: "Broker rejected order",
      events: [],
    }, {
      type: "execution.failed",
      timestamp: "2026-08-04T12:00:05.000Z",
      message: "Execution failed",
    });

    const result = await buildNotifications({
      userAccounts: [
        createAccount({
          id: "acct-1",
          userId: "user-1",
          name: "Trad Follower",
          platform: "Tradovate",
          tradovateUsername: "trad-user",
          tradovateAccountId: "T-123",
        }),
        createAccount({
          id: "acct-2",
          userId: "user-1",
          name: "Rithmic Follower",
          platform: "Rithmic",
          rithmicUsername: "rit-user",
          rithmicAccountId: "R-123",
        }),
      ],
      registeredGroups: [
        {
          group: {
            groupId: "group-1",
            userId: "user-1",
            name: "Primary Group",
            masterAccountId: "master-1",
            followerAccountIds: ["acct-1"],
            groupSettings: { enabled: true },
            riskSettings: { onRiskBreach: "PAUSE" },
            executionSettings: {
              mode: "SIMULATED",
              maxRetries: 1,
              retryDelayMs: 100,
              orderTimeoutMs: 1000,
              flattenOnEmergencyStop: false,
            },
            createdAt: "2026-08-04T11:00:00.000Z",
            updatedAt: "2026-08-04T11:00:00.000Z",
          },
          followers: [],
        },
      ],
      getRecentActivity: () => [
        {
          eventId: "event-1",
          groupId: "group-1",
          timestamp: "2026-08-04T12:03:00.000Z",
          severity: "WARN",
          category: "HEALTH",
          message: "Follower reconnecting",
        },
      ],
      positionSnapshotDependencies: {
        tradovateInstances: new Map([
          [
            "trad-user",
            {
              isTokenValid: () => true,
              async getPositions() {
                return [{ accountId: "T-123", symbol: "ESU6", netPos: 1 }];
              },
            },
          ],
        ]),
        tradeifyInstances: new Map(),
      },
    });

    assert.equal(result.unreadEstimate, 3);
    assert.deepEqual(
      result.notifications.map((notification) => ({
        category: notification.category,
        severity: notification.severity,
      })),
      [
        { category: "position", severity: "info" },
        { category: "copy_group", severity: "warn" },
        { category: "trade", severity: "error" },
      ],
    );
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});
