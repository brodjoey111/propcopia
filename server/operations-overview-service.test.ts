import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";
import { buildOperationsOverview } from "./operations-overview-service";
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

test("buildOperationsOverview aggregates positions, trade history, and copy-group alerts", async () => {
  tradeHistoryStore.clear();

  tradeHistoryStore.start();
  try {
    // Seed store via public event bus path assumptions already covered elsewhere.
    (tradeHistoryStore as any).upsert("intent-1", {
      historyId: "intent-1",
      intentId: "intent-1",
      masterAccountId: "master-1",
      masterFillId: "fill-1",
      followerAccountId: "acct-1",
      symbol: "ES",
      lifecycleStatus: "FILLED",
      createdAt: "2026-08-04T12:00:00.000Z",
      updatedAt: "2026-08-04T12:00:05.000Z",
      filledAt: "2026-08-04T12:00:05.000Z",
      events: [],
    }, {
      type: "execution.filled",
      timestamp: "2026-08-04T12:00:05.000Z",
      message: "Execution filled",
    });
    (tradeHistoryStore as any).upsert("intent-2", {
      historyId: "intent-2",
      intentId: "intent-2",
      masterAccountId: "master-1",
      masterFillId: "fill-2",
      followerAccountId: "acct-1",
      symbol: "NQ",
      lifecycleStatus: "FAILED",
      createdAt: "2026-08-04T12:01:00.000Z",
      updatedAt: "2026-08-04T12:01:05.000Z",
      failedAt: "2026-08-04T12:01:05.000Z",
      events: [],
    }, {
      type: "execution.failed",
      timestamp: "2026-08-04T12:01:05.000Z",
      message: "Execution failed",
    });

    const account = createAccount({
      id: "acct-1",
      userId: "user-1",
      name: "Trad Follower",
      platform: "Tradovate",
      tradovateUsername: "trad-user",
      tradovateAccountId: "T-123",
    });

    const result = await buildOperationsOverview({
      userAccounts: [account],
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
      getRuntime: () => ({
        state: {
          status: "RUNNING",
          connectedFollowerCount: 1,
          totalFollowerCount: 1,
        },
        health: {
          status: "DEGRADED",
        },
      }),
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
                return [{ accountId: "T-123", symbol: "ESU6", netPos: 2, openPnl: 75.5 }];
              },
            },
          ],
        ]),
        tradeifyInstances: new Map(),
      },
    });

    assert.equal(result.copyGroups.totalGroups, 1);
    assert.equal(result.copyGroups.runningGroups, 1);
    assert.equal(result.copyGroups.degradedGroups, 1);
    assert.equal(result.positions.liveAccounts, 1);
    assert.equal(result.positions.totalOpenPositions, 1);
    assert.deepEqual(result.trades, {
      total: 2,
      filled: 1,
      failed: 1,
      pending: 0,
      skippedOrRejected: 0,
    });
    assert.deepEqual(result.recentAlerts, [
      {
        eventId: "event-1",
        groupId: "group-1",
        groupName: "Primary Group",
        timestamp: "2026-08-04T12:03:00.000Z",
        severity: "WARN",
        category: "HEALTH",
        message: "Follower reconnecting",
      },
    ]);
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});
