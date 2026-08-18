import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { Account } from "@shared/schema";
import { buildNotifications } from "./notifications-service";
import { RithmicReconnectValidationStore } from "./rithmic-reconnect-validation";
import type { PersistedRithmicReadinessReview } from "./rithmic-readiness-review-store";
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

    assert.equal(result.unreadEstimate, 4);
    assert.deepEqual(
      result.notifications.map((notification) => ({
        category: notification.category,
        severity: notification.severity,
        title: notification.title,
      })),
      [
        { category: "position", severity: "info", title: "Rithmic Follower position snapshot unavailable" },
        { category: "position", severity: "warn", title: "Rithmic Follower Rithmic readiness needs reconnect proof" },
        { category: "copy_group", severity: "warn", title: "Primary Group needs follow-up" },
        { category: "trade", severity: "error", title: "ES failed" },
      ],
    );
    assert.match(
      result.notifications.find((notification) => notification.category === "copy_group")?.message ?? "",
      /Active signals: 1 warning, 1 health signal\./,
    );
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});

test("notification trade-story helpers recognize sent lifecycle states without treating them as failures", () => {
  const source = readFileSync("server/notifications-service.ts", "utf8");

  assert.match(source, /if \(status === "SENT"\)/);
  assert.match(source, /storyState: "working"/);
  assert.match(source, /if \(record\.lifecycleStatus === "SENT"\)/);
  assert.match(source, /waiting on acknowledgement/);
  assert.match(source, /record\.lifecycleStatus === "SENT" \|\|/);
});

test("buildNotifications includes Rithmic readiness alerts when reconnect proof is still missing", async () => {
  const reconnectValidationStore = new RithmicReconnectValidationStore();

  const result = await buildNotifications({
    userAccounts: [
      createAccount({
        id: "rith-1",
        userId: "user-1",
        name: "Rithmic Follower",
        platform: "Rithmic",
        rithmicUsername: "rit-user",
        rithmicPassword: "secret",
        rithmicAccountId: "R-123",
        rithmicSystemName: "Rithmic Test",
      }),
    ],
    registeredGroups: [],
    getRecentActivity: () => [],
    positionSnapshotDependencies: {
      tradovateInstances: new Map(),
      tradeifyInstances: new Map(),
    },
    rithmicInstances: new Map([
      [
        "rit-user",
        {
          isAuthenticated: () => true,
          getLastLoginMetadata: () => ({
            uniqueUserId: "USER-77",
            fcmId: "FCM-1",
            ibId: "IB-1",
            timestamp: "2026-08-12T18:00:00.000Z",
            timezone: "America/New_York",
          }),
        },
      ],
    ]),
    rithmicReconnectValidationStore: reconnectValidationStore,
  });

  const readinessNotification = result.notifications.find(
    (notification) => notification.id === "rithmic-readiness:rith-1:reconnect",
  );

  assert.equal(readinessNotification?.category, "position");
  assert.equal(readinessNotification?.severity, "warn");
  assert.match(readinessNotification?.title ?? "", /needs reconnect proof/);
  assert.match(readinessNotification?.message ?? "", /Re-check readiness/);
});

test("buildNotifications carries reviewed state for Rithmic readiness alerts", async () => {
  const reviews: PersistedRithmicReadinessReview[] = [
    {
      storyKey: "rithmic-readiness:rith-1",
      accountId: "rith-1",
      status: "reviewed",
      note: "Reconnect risk accepted until next restart.",
      reviewedAt: "2026-08-12T18:10:00.000Z",
    },
  ];

  const result = await buildNotifications({
    userAccounts: [
      createAccount({
        id: "rith-1",
        userId: "user-1",
        name: "Rithmic Follower",
        platform: "Rithmic",
        rithmicUsername: "rit-user",
        rithmicPassword: "secret",
        rithmicAccountId: "R-123",
      }),
    ],
    registeredGroups: [],
    getRecentActivity: () => [],
    positionSnapshotDependencies: {
      tradovateInstances: new Map(),
      tradeifyInstances: new Map(),
    },
    rithmicInstances: new Map([
      [
        "rit-user",
        {
          isAuthenticated: () => true,
          getLastLoginMetadata: () => ({
            uniqueUserId: "USER-77",
            fcmId: "FCM-1",
            ibId: "IB-1",
            timestamp: "2026-08-12T18:00:00.000Z",
            timezone: "America/New_York",
          }),
        },
      ],
    ]),
    rithmicReconnectValidationStore: new RithmicReconnectValidationStore(),
    rithmicReadinessReviews: reviews,
  });

  const readinessNotification = result.notifications.find(
    (notification) => notification.storyKey === "rithmic-readiness:rith-1",
  );

  assert.equal(readinessNotification?.reviewStatus, "reviewed");
  assert.equal(
    readinessNotification?.reviewNote,
    "Reconnect risk accepted until next restart.",
  );
});

test("buildNotifications compresses multiple copy-group alerts into one group story", async () => {
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
        eventId: "event-2",
        groupId: "group-1",
        timestamp: "2026-08-04T12:05:00.000Z",
        severity: "ERROR",
        category: "HEALTH",
        message: "Follower disconnected",
      },
      {
        eventId: "event-1",
        groupId: "group-1",
        timestamp: "2026-08-04T12:03:00.000Z",
        severity: "WARN",
        category: "LIFECYCLE",
        message: "Copy group Primary Group paused",
      },
    ],
    getObservability: () => ({
      groupId: "group-1",
      recentActivity: [],
      totalEvents: 4,
      infoEventCount: 2,
      warningEventCount: 1,
      errorEventCount: 1,
      restartRecoveryCount: 0,
      categoryCounts: {
        lifecycle: 2,
        trade: 0,
        rule: 0,
        intent: 0,
        execution: 0,
        health: 2,
      },
      lifecycleCounts: {
        started: 1,
        paused: 1,
        resumed: 0,
        stopped: 0,
        emergencyStopped: 0,
      },
      lastEventAt: "2026-08-04T12:05:00.000Z",
      lastLifecycleAt: "2026-08-04T12:03:00.000Z",
      lastLifecycleMessage: "Copy group Primary Group paused",
      lastErrorAt: "2026-08-04T12:05:00.000Z",
      lastErrorMessage: "Follower disconnected",
      lastRestartRecoveryAt: undefined,
      lastRestartRecoveryMessage: undefined,
    }),
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

  const copyGroupNotifications = result.notifications.filter(
    (notification) => notification.category === "copy_group",
  );

  assert.equal(copyGroupNotifications.length, 1);
  assert.equal(copyGroupNotifications[0]?.id, "copy-group-alert:group-1");
  assert.equal(copyGroupNotifications[0]?.title, "Primary Group recovery required");
  assert.match(copyGroupNotifications[0]?.message ?? "", /Follower disconnected\./);
  assert.match(copyGroupNotifications[0]?.message ?? "", /Active signals: 1 error, 1 warning, 1 health signal, 1 lifecycle update\./);
  assert.match(copyGroupNotifications[0]?.message ?? "", /Last lifecycle update: Copy group Primary Group paused/);
  assert.equal(copyGroupNotifications[0]?.restartRecoveryMessage, undefined);
});

test("buildNotifications prefers shared copy-group alert stories when available", async () => {
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
    getRecentActivity: () => [],
    copyGroupAlertStories: [
      {
        alertId: "health:group-1:2026-08-11T12:00:00.000Z",
        storyKey: "copy-group:group-1",
        userId: "user-1",
        groupId: "group-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        severity: "error",
        title: "Primary Group recovery required",
        message: "Health moved from healthy to unhealthy. Emergency stop: manual review required",
        source: "health",
        healthStatus: "UNHEALTHY",
        restartRecoveryMessage: "Recovered copy group Primary Group into STOPPED state after reload.",
        restartRecoveryAt: "2026-08-11T11:58:00.000Z",
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

  const copyGroupNotification = result.notifications.find(
    (notification) => notification.category === "copy_group",
  );

  assert.equal(copyGroupNotification?.id, "health:group-1:2026-08-11T12:00:00.000Z");
  assert.equal(copyGroupNotification?.message, "Health moved from healthy to unhealthy. Emergency stop: manual review required");
  assert.equal(
    copyGroupNotification?.restartRecoveryMessage,
    "Recovered copy group Primary Group into STOPPED state after reload.",
  );
  assert.equal(copyGroupNotification?.restartRecoveryAt, "2026-08-11T11:58:00.000Z");
});

test("buildNotifications rolls trade lifecycle updates into one warning notification for partial and acknowledged orders", async () => {
  tradeHistoryStore.clear();
  tradeHistoryStore.start();

  try {
    (tradeHistoryStore as any).upsert("intent-partial", {
      historyId: "intent-partial",
      intentId: "intent-partial",
      masterAccountId: "master-1",
      masterFillId: "fill-partial",
      followerAccountId: "acct-1",
      symbol: "NQ",
      quantity: 2,
      lifecycleStatus: "PARTIALLY_FILLED",
      partialFillCount: 1,
      filledQuantity: 1,
      remainingQuantity: 1,
      createdAt: "2026-08-04T12:00:00.000Z",
      updatedAt: "2026-08-04T12:00:05.000Z",
      events: [
        {
          type: "execution.partial_fill",
          timestamp: "2026-08-04T12:00:05.000Z",
          message: "Partial fill recorded (1/2)",
        },
        {
          type: "execution.acknowledged",
          timestamp: "2026-08-04T12:00:03.000Z",
          message: "Broker acknowledged order (WORKING)",
        },
      ],
    }, {
      type: "execution.partial_fill",
      timestamp: "2026-08-04T12:00:05.000Z",
      message: "Partial fill recorded (1/2)",
    });

    (tradeHistoryStore as any).upsert("intent-ack", {
      historyId: "intent-ack",
      intentId: "intent-ack",
      masterAccountId: "master-1",
      masterFillId: "fill-ack",
      followerAccountId: "acct-1",
      symbol: "ES",
      quantity: 1,
      lifecycleStatus: "ACKNOWLEDGED",
      createdAt: "2026-08-04T12:00:00.000Z",
      updatedAt: "2026-08-04T12:00:04.000Z",
      acknowledgedAt: "2026-08-04T12:00:04.000Z",
      events: [
        {
          type: "execution.acknowledged",
          timestamp: "2026-08-04T12:00:04.000Z",
          message: "Broker acknowledged order (WORKING)",
        },
      ],
    }, {
      type: "execution.acknowledged",
      timestamp: "2026-08-04T12:00:04.000Z",
      message: "Broker acknowledged order (WORKING)",
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
      ],
      registeredGroups: [],
      getRecentActivity: () => [],
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

    const tradeNotifications = result.notifications.filter(
      (notification) => notification.category === "trade",
    );

    assert.deepEqual(
      tradeNotifications.map((notification) => ({
        id: notification.id,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        storyKey: notification.storyKey,
        tradeSummary: notification.tradeSummary,
      })),
      [
        {
          id: "trade:intent-partial",
          severity: "warn",
          title: "NQ partially filled",
          message: "NQ is partially filled (1/2). 1 remaining. Latest update: Partial fill recorded (1/2)",
          storyKey: "intent-partial",
          tradeSummary: {
            symbol: "NQ",
            lifecycleStatus: "PARTIALLY_FILLED",
            storyState: "partial",
            attention: "watch",
            relatedEventCount: 0,
            filledQuantity: 1,
            remainingQuantity: 1,
            reviewStatus: undefined,
            reviewNote: undefined,
            reviewedAt: undefined,
          },
        },
        {
          id: "trade:intent-ack",
          severity: "warn",
          title: "ES acknowledged",
          message: "ES is acknowledged and waiting on fills. Latest update: Broker acknowledged order (WORKING)",
          storyKey: "intent-ack",
          tradeSummary: {
            symbol: "ES",
            lifecycleStatus: "ACKNOWLEDGED",
            storyState: "working",
            attention: "watch",
            relatedEventCount: 0,
            filledQuantity: undefined,
            remainingQuantity: undefined,
            reviewStatus: undefined,
            reviewNote: undefined,
            reviewedAt: undefined,
          },
        },
      ],
    );
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});

test("buildNotifications includes completed fills as low-noise trade stories", async () => {
  tradeHistoryStore.clear();
  tradeHistoryStore.start();

  try {
    (tradeHistoryStore as any).upsert("intent-filled", {
      historyId: "intent-filled",
      intentId: "intent-filled",
      masterAccountId: "master-1",
      masterFillId: "fill-filled",
      followerAccountId: "acct-1",
      symbol: "MES",
      quantity: 2,
      lifecycleStatus: "FILLED",
      filledQuantity: 2,
      averageFillPrice: 6402.5,
      createdAt: "2026-08-04T12:00:00.000Z",
      updatedAt: "2026-08-04T12:00:06.000Z",
      filledAt: "2026-08-04T12:00:06.000Z",
      events: [
        {
          type: "execution.filled",
          timestamp: "2026-08-04T12:00:06.000Z",
          message: "Execution filled",
        },
        {
          type: "execution.partial_fill",
          timestamp: "2026-08-04T12:00:05.000Z",
          message: "Partial fill recorded (1/2)",
        },
      ],
    }, {
      type: "execution.filled",
      timestamp: "2026-08-04T12:00:06.000Z",
      message: "Execution filled",
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
      ],
      registeredGroups: [],
      getRecentActivity: () => [],
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

    const tradeNotification = result.notifications.find(
      (notification) => notification.id === "trade:intent-filled",
    );

    assert.deepEqual(tradeNotification, {
      id: "trade:intent-filled",
      timestamp: "2026-08-04T12:00:06.000Z",
      severity: "info",
      category: "trade",
      title: "MES filled",
      message: "MES completed 2/2 at 6402.50. Final update: Execution filled",
      accountId: "acct-1",
      storyKey: "intent-filled",
      tradeSummary: {
        symbol: "MES",
        lifecycleStatus: "FILLED",
        storyState: "complete",
        attention: "ok",
        relatedEventCount: 0,
        filledQuantity: 2,
        remainingQuantity: undefined,
        reviewStatus: undefined,
        reviewNote: undefined,
        reviewedAt: undefined,
      },
    });
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});

test("buildNotifications includes risk alerts for warning and breached accounts", async () => {
  tradeHistoryStore.clear();
  tradeHistoryStore.start();

  try {
    const result = await buildNotifications({
      userAccounts: [
        createAccount({
          id: "acct-warn",
          userId: "user-1",
          name: "Warning Account",
          platform: "Tradovate",
          tradovateUsername: "trad-warn",
          tradovateAccountId: "T-201",
          pnl: "-850",
          maxDailyLoss: "1000",
        }),
        createAccount({
          id: "acct-breach",
          userId: "user-1",
          name: "Breached Account",
          platform: "Tradovate",
          tradovateUsername: "trad-breach",
          tradovateAccountId: "T-202",
          pnl: "-1250",
          maxDailyLoss: "1000",
        }),
      ],
      registeredGroups: [],
      getRecentActivity: () => [],
      positionSnapshotDependencies: {
        tradovateInstances: new Map([
          [
            "trad-warn",
            {
              isTokenValid: () => true,
              async getPositions() {
                return [{ accountId: "T-201", symbol: "ESU6", netPos: 1 }];
              },
            },
          ],
          [
            "trad-breach",
            {
              isTokenValid: () => true,
              async getPositions() {
                return [{ accountId: "T-202", symbol: "NQU6", netPos: 1 }];
              },
            },
          ],
        ]),
        tradeifyInstances: new Map(),
      },
    });

    const riskNotifications = result.notifications.filter(
      (notification) => notification.category === "risk",
    );

    assert.equal(riskNotifications.length, 2);
    assert.deepEqual(
      riskNotifications.map((notification) => ({
        title: notification.title,
        severity: notification.severity,
      })),
      [
        {
          title: "Warning Account risk warning",
          severity: "warn",
        },
        {
          title: "Breached Account risk breached",
          severity: "error",
        },
      ],
    );
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});

test("buildNotifications includes overdue position sync follow-up alerts", async () => {
  tradeHistoryStore.clear();
  tradeHistoryStore.start();

  try {
    const result = await buildNotifications({
      userAccounts: [
        createAccount({
          id: "acct-1",
          userId: "user-1",
          name: "Follower One",
          platform: "Tradovate",
          tradovateUsername: "trad-user",
          tradovateAccountId: "T-123",
        }),
      ],
      registeredGroups: [
        {
          group: {
            groupId: "group-1",
            userId: "user-1",
            name: "Index Leaders",
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
      getRecentActivity: () => [],
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
      positionSyncReviews: [
        {
          groupId: "group-1",
          followerAccountId: "acct-1",
          status: "approved",
          approvedAt: "2026-08-11T11:00:00.000Z",
        },
        {
          groupId: "group-1",
          followerAccountId: "acct-1",
          status: "handed_off",
          operatorName: "joseph",
          approvedAt: "2026-08-11T11:00:00.000Z",
          handedOffAt: "2026-08-11T11:15:00.000Z",
        },
      ],
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    const followUpNotifications = result.notifications.filter((notification) =>
      notification.id.startsWith("position-sync-follow-up:"),
    );

    assert.deepEqual(
      followUpNotifications.map((notification) => ({
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
      })),
      [
        {
          severity: "error",
          title: "Index Leaders manual sync completion overdue",
          message: "Follower One has been waiting 45 minutes for manual completion. Assigned operator: joseph.",
        },
        {
          severity: "warn",
          title: "Index Leaders manual sync handoff overdue",
          message: "Follower One has been approved for 60 minutes without operator handoff. No operator assigned.",
        },
      ],
    );
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});

test("buildNotifications includes overdue execution follow-up alerts for open review and stale broker states", async () => {
  tradeHistoryStore.clear();
  tradeHistoryStore.start();

  try {
    (tradeHistoryStore as any).upsert("failed-open", {
      historyId: "failed-open",
      intentId: "failed-open",
      masterAccountId: "master-1",
      masterFillId: "fill-failed-open",
      followerAccountId: "acct-1",
      symbol: "ES",
      lifecycleStatus: "FAILED",
      createdAt: "2026-08-11T11:30:00.000Z",
      updatedAt: "2026-08-11T11:40:00.000Z",
      failedAt: "2026-08-11T11:40:00.000Z",
      lastErrorMessage: "Broker rejected order",
      events: [
        {
          type: "execution.failed",
          timestamp: "2026-08-11T11:40:00.000Z",
          message: "Execution failed",
        },
      ],
    }, {
      type: "execution.failed",
      timestamp: "2026-08-11T11:40:00.000Z",
      message: "Execution failed",
    });

    (tradeHistoryStore as any).upsert("ack-stale", {
      historyId: "ack-stale",
      intentId: "ack-stale",
      masterAccountId: "master-1",
      masterFillId: "fill-ack-stale",
      followerAccountId: "acct-1",
      symbol: "NQ",
      lifecycleStatus: "ACKNOWLEDGED",
      createdAt: "2026-08-11T11:43:00.000Z",
      updatedAt: "2026-08-11T11:48:00.000Z",
      acknowledgedAt: "2026-08-11T11:48:00.000Z",
      events: [
        {
          type: "execution.acknowledged",
          timestamp: "2026-08-11T11:48:00.000Z",
          message: "Broker acknowledged order (WORKING)",
        },
      ],
    }, {
      type: "execution.acknowledged",
      timestamp: "2026-08-11T11:48:00.000Z",
      message: "Broker acknowledged order (WORKING)",
    });

    (tradeHistoryStore as any).upsert("sent-stale", {
      historyId: "sent-stale",
      intentId: "sent-stale",
      masterAccountId: "master-1",
      masterFillId: "fill-sent-stale",
      followerAccountId: "acct-1",
      symbol: "MES",
      lifecycleStatus: "SENT",
      createdAt: "2026-08-11T11:42:00.000Z",
      updatedAt: "2026-08-11T11:46:00.000Z",
      sentAt: "2026-08-11T11:46:00.000Z",
      brokerOrderId: "BRK-SENT-1",
      events: [
        {
          type: "execution.sent",
          timestamp: "2026-08-11T11:46:00.000Z",
          message: "Execution sent to broker",
        },
      ],
    }, {
      type: "execution.sent",
      timestamp: "2026-08-11T11:46:00.000Z",
      message: "Execution sent to broker",
    });

    (tradeHistoryStore as any).upsert("failed-reviewed", {
      historyId: "failed-reviewed",
      intentId: "failed-reviewed",
      masterAccountId: "master-1",
      masterFillId: "fill-failed-reviewed",
      followerAccountId: "acct-1",
      symbol: "YM",
      lifecycleStatus: "FAILED",
      createdAt: "2026-08-11T11:20:00.000Z",
      updatedAt: "2026-08-11T11:30:00.000Z",
      failedAt: "2026-08-11T11:30:00.000Z",
      lastErrorMessage: "Rejected upstream",
      reviewStatus: "reviewed",
      reviewNote: "Already investigated.",
      reviewedAt: "2026-08-11T11:35:00.000Z",
      events: [
        {
          type: "execution.failed",
          timestamp: "2026-08-11T11:30:00.000Z",
          message: "Execution failed",
        },
      ],
    }, {
      type: "execution.failed",
      timestamp: "2026-08-11T11:30:00.000Z",
      message: "Execution failed",
    });

    const result = await buildNotifications({
      userAccounts: [
        createAccount({
          id: "acct-1",
          userId: "user-1",
          name: "Follower One",
          platform: "Tradovate",
          tradovateUsername: "trad-user",
          tradovateAccountId: "T-123",
        }),
      ],
      registeredGroups: [],
      getRecentActivity: () => [],
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
      executionFollowUpReviews: [
        {
          historyId: "failed-open",
          status: "pending",
          operatorName: "joseph",
        },
        {
          historyId: "failed-reviewed",
          status: "reviewed",
          operatorName: "joseph",
          note: "Already investigated.",
          reviewedAt: "2026-08-11T11:35:00.000Z",
        },
      ],
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    const executionFollowUpNotifications = result.notifications.filter((notification) =>
      notification.id.startsWith("execution-follow-up:"),
    );

    assert.deepEqual(
      executionFollowUpNotifications.map((notification) => ({
        id: notification.id,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
      })),
      [
        {
          id: "execution-follow-up:ack-stale:stale",
          severity: "warn",
          title: "NQ broker recheck overdue",
          message: "Broker acknowledgement is 12 minutes old without a fill update. No operator assigned.",
        },
        {
          id: "execution-follow-up:sent-stale:stale",
          severity: "warn",
          title: "MES broker recheck overdue",
          message: "Broker acknowledgement has not arrived 14 minutes after submission. No operator assigned.",
        },
        {
          id: "execution-follow-up:failed-open:review",
          severity: "error",
          title: "ES execution follow-up overdue",
          message: "failed has been waiting 20 minutes for operator review. Assigned operator: joseph.",
        },
      ],
    );
  } finally {
    tradeHistoryStore.stop();
    tradeHistoryStore.clear();
  }
});
