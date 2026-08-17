import assert from "node:assert/strict";
import test from "node:test";

import type { Account } from "@shared/schema";

import {
  buildCopyGroupRuntimeState,
  buildCopyGroupSyncPlan,
  hydrateBoardStateFromSnapshot,
  type PersistedTradingGroup,
} from "./copy-group-persistence";

function createAccount(overrides: Partial<Account>): Account {
  return {
    id: overrides.id ?? "account-1",
    userId: overrides.userId ?? "user-1",
    name: overrides.name ?? "Account",
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

function createGroup(overrides: Partial<PersistedTradingGroup>): PersistedTradingGroup {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Primary Group",
    color: overrides.color ?? "#3b82f6",
    isActive: overrides.isActive ?? true,
    masterId: overrides.masterId ?? "master-1",
    disabledAccountIds: overrides.disabledAccountIds ?? [],
    runtimePreference: overrides.runtimePreference ?? "ready",
  };
}

test("buildCopyGroupSyncPlan maps board groups into backend payloads", () => {
  const result = buildCopyGroupSyncPlan({
    userId: "user-1",
    groups: [
      createGroup({
        id: "group-1",
        masterId: "master-1",
        disabledAccountIds: ["follower-2"],
      }),
    ],
    assignments: {
      "master-1": "group-1",
      "follower-1": "group-1",
      "follower-2": "group-1",
    },
    accounts: [
      createAccount({
        id: "master-1",
        accountType: "master",
      }),
      createAccount({
        id: "follower-1",
        copySizingMode: "FIXED",
        fixedQuantity: 2,
        maxContracts: 5,
      }),
      createAccount({
        id: "follower-2",
        positionScaling: 50,
      }),
    ],
    groupRiskSettings: {
      "group-1": {
        blockedTickers: ["NQ"],
        allowedTickers: ["ES"],
        maxContracts: 6,
        maxDailyLoss: 750,
        onBreachAction: "close_and_pause",
      },
    },
    registeredGroupIds: [],
  });

  assert.deepEqual(result.desiredGroupIds, ["group-1"]);
  assert.deepEqual(result.removedGroupIds, []);
  assert.equal(result.payloads.length, 1);
  assert.equal(result.payloads[0]?.board?.position, 0);
  assert.deepEqual(result.payloads[0]?.board?.riskSettings, {
    blockedTickers: ["NQ"],
    allowedTickers: ["ES"],
    maxContracts: 6,
    maxDailyLoss: 750,
    onBreachAction: "close_and_pause",
  });
  assert.deepEqual(result.payloads[0]?.group.followerAccountIds, ["follower-1", "follower-2"]);
  assert.deepEqual(result.payloads[0]?.group.groupSettings.allowedSymbols, ["ES"]);
  assert.deepEqual(result.payloads[0]?.group.groupSettings.blockedSymbols, ["NQ"]);
  assert.equal(result.payloads[0]?.group.riskSettings.maxGroupContracts, 6);
  assert.equal(result.payloads[0]?.group.riskSettings.maxDailyLoss, 750);
  assert.equal(result.payloads[0]?.group.riskSettings.onRiskBreach, "FLATTEN_AND_STOP");
  assert.equal(result.payloads[0]?.group.executionSettings.mode, "SIMULATED");
  assert.equal(result.payloads[0]?.followers[0]?.sizingMode, "FIXED");
  assert.equal(result.payloads[0]?.followers[0]?.fixedQuantity, 2);
  assert.equal(result.payloads[0]?.followers[1]?.enabled, false);
  assert.equal(result.payloads[0]?.runtimeState.status, "STOPPED");
});

test("buildCopyGroupSyncPlan preserves paused board groups as paused runtime state", () => {
  const result = buildCopyGroupSyncPlan({
    userId: "user-1",
    groups: [createGroup({ id: "group-1", isActive: false })],
    assignments: {
      "master-1": "group-1",
      "follower-1": "group-1",
    },
    accounts: [
      createAccount({ id: "master-1", accountType: "master" }),
      createAccount({ id: "follower-1" }),
    ],
  });

  assert.equal(result.payloads[0]?.runtimeState.status, "PAUSED");
  assert.equal(result.payloads[0]?.runtimeState.isKillSwitchActive, false);
  assert.equal(result.payloads[0]?.runtimeState.totalFollowerCount, 1);
});

test("buildCopyGroupSyncPlan preserves emergency-stopped board groups as emergency-stopped runtime state", () => {
  const result = buildCopyGroupSyncPlan({
    userId: "user-1",
    groups: [
      createGroup({
        id: "group-1",
        isActive: false,
        runtimePreference: "emergency_stopped",
      }),
    ],
    assignments: {
      "master-1": "group-1",
      "follower-1": "group-1",
    },
    accounts: [
      createAccount({ id: "master-1", accountType: "master" }),
      createAccount({ id: "follower-1" }),
    ],
  });

  assert.equal(result.payloads[0]?.runtimeState.status, "EMERGENCY_STOPPED");
  assert.equal(result.payloads[0]?.runtimeState.isKillSwitchActive, true);
  assert.equal(result.payloads[0]?.runtimeState.totalFollowerCount, 1);
});

test("buildCopyGroupRuntimeState maps ready, paused, and emergency-stop states consistently", () => {
  const stopped = buildCopyGroupRuntimeState({
    id: "group-1",
    isActive: true,
    runtimePreference: "ready",
    totalFollowerCount: 2,
    nowIso: "2026-08-12T12:00:00.000Z",
  });
  const paused = buildCopyGroupRuntimeState({
    id: "group-2",
    isActive: false,
    runtimePreference: "paused",
    totalFollowerCount: 1,
    nowIso: "2026-08-12T12:00:00.000Z",
  });
  const emergencyStopped = buildCopyGroupRuntimeState({
    id: "group-3",
    isActive: false,
    runtimePreference: "emergency_stopped",
    totalFollowerCount: 4,
    nowIso: "2026-08-12T12:00:00.000Z",
  });

  assert.equal(stopped.status, "STOPPED");
  assert.equal(stopped.stoppedAt, "2026-08-12T12:00:00.000Z");
  assert.equal(stopped.totalFollowerCount, 2);

  assert.equal(paused.status, "PAUSED");
  assert.equal(paused.pausedAt, "2026-08-12T12:00:00.000Z");
  assert.equal(paused.totalFollowerCount, 1);

  assert.equal(emergencyStopped.status, "EMERGENCY_STOPPED");
  assert.equal(
    emergencyStopped.emergencyStoppedAt,
    "2026-08-12T12:00:00.000Z",
  );
  assert.equal(emergencyStopped.isKillSwitchActive, true);
  assert.equal(emergencyStopped.totalFollowerCount, 4);
});

test("buildCopyGroupSyncPlan skips groups without a valid master and reports stale backend groups", () => {
  const result = buildCopyGroupSyncPlan({
    userId: "user-1",
    groups: [
      createGroup({ id: "group-1", masterId: null }),
      createGroup({ id: "group-2", masterId: "missing-master" }),
    ],
    assignments: {},
    accounts: [],
    registeredGroupIds: ["group-1", "group-2", "group-3"],
  });

  assert.deepEqual(result.payloads, []);
  assert.deepEqual(result.desiredGroupIds, []);
  assert.deepEqual(result.removedGroupIds, ["group-1", "group-2", "group-3"]);
});

test("hydrateBoardStateFromSnapshot maps persisted copy groups into board state and preserves local presentation details", () => {
  const result = hydrateBoardStateFromSnapshot(
    {
      success: true,
      generatedAt: "2026-08-11T12:10:00.000Z",
      runningGroups: [],
      groups: [
        {
          board: {
            color: "#22c55e",
            position: 1,
            riskSettings: {
              maxContracts: 3,
              onBreachAction: "alert",
            },
          },
          group: {
            group: {
              groupId: "group-2",
              name: "Secondary Group",
              masterAccountId: "master-2",
              followerAccountIds: ["follower-3"],
            },
          },
          runtime: {
            state: {
              groupId: "group-2",
              status: "STOPPED",
              isKillSwitchActive: false,
              masterConnected: false,
              connectedFollowerCount: 0,
              totalFollowerCount: 1,
            },
          },
          activityPreview: [],
        },
        {
          board: {
            color: "#ec4899",
            position: 0,
            riskSettings: {
              blockedTickers: ["NQ"],
              maxDailyLoss: 500,
              onBreachAction: "pause",
            },
          },
          group: {
            group: {
              groupId: "group-1",
              name: "Primary Group",
              masterAccountId: "master-1",
              followerAccountIds: ["follower-1", "follower-2"],
            },
          },
          runtime: {
            state: {
              groupId: "group-1",
              status: "PAUSED",
              isKillSwitchActive: false,
              masterConnected: false,
              connectedFollowerCount: 0,
              totalFollowerCount: 2,
            },
          },
          activityPreview: [],
        },
      ],
    },
    [
      createGroup({
        id: "group-1",
        color: "#22c55e",
        disabledAccountIds: ["follower-2"],
      }),
    ],
  );

  assert.deepEqual(result.groups, [
    {
      id: "group-1",
      name: "Primary Group",
      color: "#ec4899",
      isActive: false,
      masterId: "master-1",
      disabledAccountIds: ["follower-2"],
      runtimePreference: "paused",
    },
    {
      id: "group-2",
      name: "Secondary Group",
      color: "#22c55e",
      isActive: true,
      masterId: "master-2",
      disabledAccountIds: [],
      runtimePreference: "ready",
    },
  ]);
  assert.deepEqual(result.assignments, {
    "master-1": "group-1",
    "follower-1": "group-1",
    "follower-2": "group-1",
    "master-2": "group-2",
    "follower-3": "group-2",
  });
  assert.deepEqual(result.groupRiskSettings, {
    "group-1": {
      blockedTickers: ["NQ"],
      maxDailyLoss: 500,
      onBreachAction: "pause",
    },
    "group-2": {
      maxContracts: 3,
      onBreachAction: "alert",
    },
  });
});
