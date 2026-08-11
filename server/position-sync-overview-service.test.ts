import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import type { PositionSnapshotResult } from "./position-snapshot-service";
import {
  buildPositionSyncOverview,
  filterPositionSyncOverviewByGroupId,
} from "./position-sync-overview-service";

function createAccount(overrides: Partial<Account>): Account {
  return {
    id: overrides.id ?? "acct-1",
    userId: overrides.userId ?? "user-1",
    name: overrides.name ?? "Account 1",
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

function createPositionSnapshotResult(): PositionSnapshotResult {
  return {
    generatedAt: "2026-08-11T15:00:00.000Z",
    summary: {
      totalAccounts: 3,
      liveAccounts: 3,
      disconnectedAccounts: 0,
      unavailableAccounts: 0,
      errorAccounts: 0,
      totalOpenPositions: 3,
    },
    accounts: [
      {
        accountId: "master-1",
        userId: "user-1",
        name: "Master",
        platform: "Tradovate",
        accountType: "master",
        status: "LIVE",
        positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
      {
        accountId: "follower-1",
        userId: "user-1",
        name: "Follower 1",
        platform: "Tradovate",
        accountType: "follower",
        status: "LIVE",
        positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
      {
        accountId: "follower-2",
        userId: "user-1",
        name: "Follower 2",
        platform: "Tradovate",
        accountType: "follower",
        status: "LIVE",
        positions: [{ symbol: "ESU6", quantity: 1, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
    ],
  };
}

test("buildPositionSyncOverview summarizes group-level sync state", () => {
  const accounts = [
    createAccount({ id: "master-1", name: "Master", accountType: "master" }),
    createAccount({ id: "follower-1", name: "Follower 1" }),
    createAccount({ id: "follower-2", name: "Follower 2" }),
  ];
  const registeredGroups: RegisteredCopyGroup[] = [
    {
      group: {
        groupId: "group-1",
        userId: "user-1",
        name: "Primary Group",
        masterAccountId: "master-1",
        followerAccountIds: ["follower-1", "follower-2"],
        groupSettings: { enabled: true },
        riskSettings: { onRiskBreach: "PAUSE" },
        executionSettings: {
          mode: "SIMULATED",
          maxRetries: 0,
          retryDelayMs: 1000,
          orderTimeoutMs: 5000,
          flattenOnEmergencyStop: false,
        },
        createdAt: "2026-08-11T15:00:00.000Z",
        updatedAt: "2026-08-11T15:00:00.000Z",
      },
      followers: [
        {
          groupId: "group-1",
          followerAccountId: "follower-1",
          enabled: true,
          createdAt: "2026-08-11T15:00:00.000Z",
          updatedAt: "2026-08-11T15:00:00.000Z",
        },
        {
          groupId: "group-1",
          followerAccountId: "follower-2",
          enabled: true,
          createdAt: "2026-08-11T15:00:00.000Z",
          updatedAt: "2026-08-11T15:00:00.000Z",
        },
      ],
    },
  ];

  const result = buildPositionSyncOverview({
    userAccounts: accounts,
    registeredGroups,
    positionSnapshot: createPositionSnapshotResult(),
  });

  assert.equal(result.summary.totalGroups, 1);
  assert.equal(result.summary.outOfSyncGroups, 1);
  assert.equal(result.summary.outOfSyncFollowers, 1);
  assert.equal(result.groups[0]?.status, "OUT_OF_SYNC");
  assert.equal(result.groups[0]?.followers[0]?.status, "IN_SYNC");
  assert.equal(result.groups[0]?.followers[1]?.status, "OUT_OF_SYNC");
  assert.equal(result.groups[0]?.followers[1]?.adjustmentCount, 1);
});

test("filterPositionSyncOverviewByGroupId narrows the response and recalculates summary totals", () => {
  const accounts = [
    createAccount({ id: "master-1", name: "Master 1", accountType: "master" }),
    createAccount({ id: "master-2", name: "Master 2", accountType: "master" }),
    createAccount({ id: "follower-1", name: "Follower 1" }),
    createAccount({ id: "follower-2", name: "Follower 2" }),
  ];
  const registeredGroups: RegisteredCopyGroup[] = [
    {
      group: {
        groupId: "group-1",
        userId: "user-1",
        name: "Primary Group",
        masterAccountId: "master-1",
        followerAccountIds: ["follower-1"],
        groupSettings: { enabled: true },
        riskSettings: { onRiskBreach: "PAUSE" },
        executionSettings: {
          mode: "SIMULATED",
          maxRetries: 0,
          retryDelayMs: 1000,
          orderTimeoutMs: 5000,
          flattenOnEmergencyStop: false,
        },
        createdAt: "2026-08-11T15:00:00.000Z",
        updatedAt: "2026-08-11T15:00:00.000Z",
      },
      followers: [
        {
          groupId: "group-1",
          followerAccountId: "follower-1",
          enabled: true,
          createdAt: "2026-08-11T15:00:00.000Z",
          updatedAt: "2026-08-11T15:00:00.000Z",
        },
      ],
    },
    {
      group: {
        groupId: "group-2",
        userId: "user-1",
        name: "Secondary Group",
        masterAccountId: "master-2",
        followerAccountIds: ["follower-2"],
        groupSettings: { enabled: true },
        riskSettings: { onRiskBreach: "PAUSE" },
        executionSettings: {
          mode: "SIMULATED",
          maxRetries: 0,
          retryDelayMs: 1000,
          orderTimeoutMs: 5000,
          flattenOnEmergencyStop: false,
        },
        createdAt: "2026-08-11T15:00:00.000Z",
        updatedAt: "2026-08-11T15:00:00.000Z",
      },
      followers: [
        {
          groupId: "group-2",
          followerAccountId: "follower-2",
          enabled: true,
          createdAt: "2026-08-11T15:00:00.000Z",
          updatedAt: "2026-08-11T15:00:00.000Z",
        },
      ],
    },
  ];
  const positionSnapshot: PositionSnapshotResult = {
    generatedAt: "2026-08-11T15:00:00.000Z",
    summary: {
      totalAccounts: 4,
      liveAccounts: 4,
      disconnectedAccounts: 0,
      unavailableAccounts: 0,
      errorAccounts: 0,
      totalOpenPositions: 3,
    },
    accounts: [
      {
        accountId: "master-1",
        userId: "user-1",
        name: "Master 1",
        platform: "Tradovate",
        accountType: "master",
        status: "LIVE",
        positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
      {
        accountId: "master-2",
        userId: "user-1",
        name: "Master 2",
        platform: "Tradovate",
        accountType: "master",
        status: "LIVE",
        positions: [{ symbol: "NQU6", quantity: 1, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
      {
        accountId: "follower-1",
        userId: "user-1",
        name: "Follower 1",
        platform: "Tradovate",
        accountType: "follower",
        status: "LIVE",
        positions: [{ symbol: "ESU6", quantity: 1, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
      {
        accountId: "follower-2",
        userId: "user-1",
        name: "Follower 2",
        platform: "Tradovate",
        accountType: "follower",
        status: "LIVE",
        positions: [{ symbol: "NQU6", quantity: 1, side: "LONG" }],
        openPositionCount: 1,
        capturedAt: "2026-08-11T15:00:00.000Z",
      },
    ],
  };

  const overview = buildPositionSyncOverview({
    userAccounts: accounts,
    registeredGroups,
    positionSnapshot,
  });

  const filtered = filterPositionSyncOverviewByGroupId(overview, "group-2");

  assert.equal(filtered.summary.totalGroups, 1);
  assert.equal(filtered.summary.inSyncGroups, 1);
  assert.equal(filtered.summary.outOfSyncGroups, 0);
  assert.equal(filtered.summary.outOfSyncFollowers, 0);
  assert.equal(filtered.groups.length, 1);
  assert.equal(filtered.groups[0]?.groupId, "group-2");
});
