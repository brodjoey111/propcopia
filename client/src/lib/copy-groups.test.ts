import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCopySessionSignalRows,
  buildCopyGroupHealthWatchlist,
  buildCopyGroupActivityFeed,
  buildCopyGroupHistorySummary,
  buildCopyGroupRestartRecoveryItems,
  buildCopyGroupActivityTimeline,
  clusterCopyGroupActivityFeed,
  describeCopyGroupBoardState,
  describeCopyGroupPulse,
  describeCopyGroupRuntimeSummary,
  filterCopyGroupActivityFeed,
  summarizeCopyGroups,
  type CopyGroup,
} from "./copy-groups";

function createGroup(overrides: Partial<CopyGroup>): CopyGroup {
  return {
    groupId: overrides.groupId ?? "group-1",
    name: overrides.name ?? "Primary Futures",
    masterAccountId: overrides.masterAccountId ?? "master-1",
    followerAccountIds: overrides.followerAccountIds ?? ["follower-1", "follower-2"],
    runtime: overrides.runtime ?? {
      groupId: overrides.groupId ?? "group-1",
      status: "RUNNING",
      isKillSwitchActive: false,
      masterConnected: true,
      connectedFollowerCount: 2,
      totalFollowerCount: 2,
    },
    statistics: overrides.statistics ?? {
      groupId: overrides.groupId ?? "group-1",
      tradesObserved: 4,
      intentsCreated: 4,
      intentsSent: 4,
      intentsAcknowledged: 4,
      intentsFilled: 4,
      intentsRejected: 0,
      intentsCancelled: 0,
      intentsFailed: 0,
      followerOrdersSubmitted: 4,
      followerOrdersSucceeded: 4,
      followerOrdersFailed: 0,
      skippedBlockedSymbolCount: 0,
      skippedDisabledFollowerCount: 0,
      skippedZeroQuantityCount: 0,
      avgDispatchLatencyMs: 14,
      p50DispatchLatencyMs: 13,
      p95DispatchLatencyMs: 19,
      p99DispatchLatencyMs: 21,
      lastUpdatedAt: "2026-08-04T12:00:00.000Z",
    },
    health: overrides.health ?? {
      groupId: overrides.groupId ?? "group-1",
      status: "HEALTHY",
      warnings: [],
      errors: [],
      checkedAt: "2026-08-04T12:00:00.000Z",
    },
  };
}

test("summarizeCopyGroups totals statuses and follower readiness", () => {
  const summary = summarizeCopyGroups([
    createGroup({}),
    createGroup({
      groupId: "group-2",
      name: "Paused Group",
      runtime: {
        groupId: "group-2",
        status: "PAUSED",
        isKillSwitchActive: false,
        masterConnected: true,
        connectedFollowerCount: 1,
        totalFollowerCount: 2,
      },
      health: {
        groupId: "group-2",
        status: "DEGRADED",
        warnings: ["Follower disconnected"],
        errors: [],
        checkedAt: "2026-08-04T12:01:00.000Z",
      },
      statistics: {
        ...createGroup({ groupId: "group-2" }).statistics,
        groupId: "group-2",
        avgDispatchLatencyMs: 20,
      },
    }),
    createGroup({
      groupId: "group-3",
      name: "Emergency Stop",
      runtime: {
        groupId: "group-3",
        status: "EMERGENCY_STOPPED",
        isKillSwitchActive: true,
        masterConnected: false,
        connectedFollowerCount: 0,
        totalFollowerCount: 1,
      },
      health: {
        groupId: "group-3",
        status: "UNHEALTHY",
        warnings: [],
        errors: ["Master disconnected"],
        checkedAt: "2026-08-04T12:02:00.000Z",
      },
      statistics: {
        ...createGroup({ groupId: "group-3" }).statistics,
        groupId: "group-3",
        avgDispatchLatencyMs: 0,
      },
    }),
  ]);

  assert.deepEqual(summary, {
    totalGroups: 3,
    runningGroups: 1,
    pausedGroups: 1,
    stoppedGroups: 0,
    errorGroups: 1,
    degradedGroups: 1,
    unhealthyGroups: 1,
    connectedFollowers: 3,
    totalFollowers: 5,
    avgDispatchLatencyMs: 17,
  });
});

test("buildCopyGroupActivityFeed sorts newest first and maps activity types", () => {
  const groups = [
    createGroup({ groupId: "group-1", name: "Alpha" }),
    createGroup({ groupId: "group-2", name: "Beta" }),
  ];

  const items = buildCopyGroupActivityFeed(groups, {
    "group-1": [
      {
        eventId: "event-1",
        groupId: "group-1",
        timestamp: "2026-08-04T12:00:00.000Z",
        severity: "INFO",
        category: "EXECUTION",
        message: "Follower order submitted",
      },
    ],
    "group-2": [
      {
        eventId: "event-2",
        groupId: "group-2",
        timestamp: "2026-08-04T12:01:00.000Z",
        severity: "WARN",
        category: "HEALTH",
        message: "Follower disconnected",
      },
      {
        eventId: "event-3",
        groupId: "group-2",
        timestamp: "2026-08-04T12:02:00.000Z",
        severity: "ERROR",
        category: "RULE",
        message: "Risk breach",
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      groupName: item.groupName,
      type: item.type,
      intentId: item.intentId,
    })),
    [
      { id: "event-3", groupName: "Beta", type: "error", intentId: undefined },
      { id: "event-2", groupName: "Beta", type: "connection", intentId: undefined },
      { id: "event-1", groupName: "Alpha", type: "trade", intentId: undefined },
    ],
  );
});

test("buildCopyGroupHealthWatchlist prioritizes unhealthy and degraded groups", () => {
  const watchlist = buildCopyGroupHealthWatchlist([
    createGroup({
      groupId: "group-1",
      name: "Healthy Runner",
    }),
    createGroup({
      groupId: "group-2",
      name: "Degraded Runner",
      runtime: {
        groupId: "group-2",
        status: "RUNNING",
        isKillSwitchActive: false,
        masterConnected: true,
        connectedFollowerCount: 1,
        totalFollowerCount: 2,
      },
      health: {
        groupId: "group-2",
        status: "DEGRADED",
        warnings: ["Follower reconnecting"],
        errors: [],
        checkedAt: "2026-08-04T12:02:00.000Z",
      },
    }),
    createGroup({
      groupId: "group-3",
      name: "Emergency Group",
      runtime: {
        groupId: "group-3",
        status: "EMERGENCY_STOPPED",
        isKillSwitchActive: true,
        emergencyStopReason: "Manual kill switch",
        masterConnected: false,
        connectedFollowerCount: 0,
        totalFollowerCount: 1,
      },
      health: {
        groupId: "group-3",
        status: "UNHEALTHY",
        warnings: [],
        errors: ["Master disconnected"],
        checkedAt: "2026-08-04T12:03:00.000Z",
      },
    }),
    createGroup({
      groupId: "group-4",
      name: "Paused Group",
      runtime: {
        groupId: "group-4",
        status: "PAUSED",
        isKillSwitchActive: false,
        masterConnected: true,
        connectedFollowerCount: 2,
        totalFollowerCount: 2,
      },
    }),
  ]);

  assert.deepEqual(watchlist.counts, {
    attention: 1,
    degraded: 1,
    paused: 1,
    disconnectedFollowers: 2,
  });
  assert.deepEqual(
    watchlist.entries.map((entry) => ({
      groupName: entry.groupName,
      concernLabel: entry.concernLabel,
      tone: entry.tone,
      recoveryQueueLabel: entry.recoveryQueueLabel,
      routingGateLabel: entry.routingGateLabel,
    })),
    [
      { groupName: "Emergency Group", concernLabel: "Needs attention", tone: "danger", recoveryQueueLabel: "Recover now", routingGateLabel: "Recovery gate" },
      { groupName: "Degraded Runner", concernLabel: "On watch", tone: "warn", recoveryQueueLabel: "Stabilize soon", routingGateLabel: "Routing gate" },
      { groupName: "Paused Group", concernLabel: "Paused", tone: "muted", recoveryQueueLabel: "Resume check", routingGateLabel: "Resume gate" },
    ],
  );
  assert.match(
    watchlist.entries[2]?.routingGateDetail ?? "",
    /Master and followers look ready\. Resume when the next routing window opens\./,
  );
  assert.equal(watchlist.entries[2]?.routingGateTone, "ok");
});

test("buildCopyGroupHealthWatchlist includes recovery and stability context", () => {
  const watchlist = buildCopyGroupHealthWatchlist(
    [
      createGroup({
        groupId: "group-2",
        name: "Degraded Runner",
        runtime: {
          groupId: "group-2",
          status: "RUNNING",
          isKillSwitchActive: false,
          masterConnected: true,
          connectedFollowerCount: 1,
          totalFollowerCount: 2,
        },
        health: {
          groupId: "group-2",
          status: "DEGRADED",
          warnings: ["Follower reconnecting"],
          errors: [],
          checkedAt: "2026-08-04T12:02:00.000Z",
        },
      }),
    ],
    {
      "group-2": [
        {
          eventId: "event-1",
          groupId: "group-2",
          timestamp: "2026-08-04T12:03:00.000Z",
          severity: "WARN",
          category: "HEALTH",
          message: "Follower reconnecting",
        },
        {
          eventId: "event-2",
          groupId: "group-2",
          timestamp: "2026-08-04T12:01:00.000Z",
          severity: "INFO",
          category: "LIFECYCLE",
          message: "Copy group Degraded Runner resumed.",
        },
      ],
    },
    "2026-08-04T12:33:00.000Z",
  );

  assert.match(
    watchlist.entries[0]?.latestRecoveryActionLabel ?? "",
    /Copy group Degraded Runner resumed\./,
  );
  assert.equal(
    watchlist.entries[0]?.latestRestartRecoveryLabel,
    undefined,
  );
  assert.match(
    watchlist.entries[0]?.lastStableSignalLabel ?? "",
    /Last stable signal at Aug 4,/,
  );
  assert.equal(watchlist.entries[0]?.routingGateLabel, "Routing gate");
  assert.match(
    watchlist.entries[0]?.routingGateDetail ?? "",
    /Reconnect 1 follower before you route this group again\./,
  );
  assert.equal(watchlist.entries[0]?.routingGateTone, "warn");
  assert.equal(watchlist.entries[0]?.signalFreshnessLabel, "Quiet 30m");
  assert.match(
    watchlist.entries[0]?.signalFreshnessDetail ?? "",
    /Monitor the next routing window before escalating this group\./,
  );
  assert.equal(watchlist.entries[0]?.signalFreshnessTone, "muted");
  assert.equal(watchlist.entries[0]?.timeInConcernStateLabel, "30 minutes");
});

test("buildCopyGroupHealthWatchlist surfaces restart recovery context separately from general recovery actions", () => {
  const watchlist = buildCopyGroupHealthWatchlist(
    [
      createGroup({
        groupId: "group-3",
        name: "Recovered Group",
        runtime: {
          groupId: "group-3",
          status: "STOPPED",
          isKillSwitchActive: false,
          masterConnected: false,
          connectedFollowerCount: 0,
          totalFollowerCount: 2,
        },
        health: {
          groupId: "group-3",
          status: "HEALTHY",
          warnings: [],
          errors: [],
          checkedAt: "2026-08-04T12:05:00.000Z",
        },
      }),
    ],
    {
      "group-3": [
        {
          eventId: "event-1",
          groupId: "group-3",
          timestamp: "2026-08-04T12:04:00.000Z",
          severity: "INFO",
          category: "LIFECYCLE",
          message: "Recovered copy group Recovered Group into STOPPED state after reload.",
        },
      ],
    },
    "2026-08-04T12:33:00.000Z",
  );

  assert.match(
    watchlist.entries[0]?.latestRestartRecoveryLabel ?? "",
    /Recovered copy group Recovered Group into STOPPED state after reload\./,
  );
  assert.equal(
    watchlist.entries[0]?.latestRestartRecoveryAt,
    "2026-08-04T12:04:00.000Z",
  );
  assert.equal(watchlist.entries[0]?.routingGateLabel, "Stage gate");
  assert.match(
    watchlist.entries[0]?.routingGateDetail ?? "",
    /Reconnect the master account before you stage this group again\./,
  );
  assert.equal(watchlist.entries[0]?.routingGateTone, "danger");
  assert.equal(watchlist.entries[0]?.signalFreshnessLabel, "Quiet 29m");
  assert.match(
    watchlist.entries[0]?.signalFreshnessDetail ?? "",
    /Quiet history can be normal while this group remains offline\./,
  );
  assert.equal(watchlist.entries[0]?.signalFreshnessTone, "muted");
});

test("clusterCopyGroupActivityFeed combines consecutive updates for the same order path", () => {
  const feed = buildCopyGroupActivityFeed(
    [createGroup({ groupId: "group-1", name: "Alpha" })],
    {
      "group-1": [
        {
          eventId: "event-1",
          groupId: "group-1",
          timestamp: "2026-08-04T12:02:00.000Z",
          severity: "WARN",
          category: "EXECUTION",
          message: "Execution failed for ES.",
          intentId: "intent-1",
          followerAccountId: "follower-1",
        },
        {
          eventId: "event-2",
          groupId: "group-1",
          timestamp: "2026-08-04T12:01:00.000Z",
          severity: "INFO",
          category: "EXECUTION",
          message: "Execution sent to broker.",
          intentId: "intent-1",
          followerAccountId: "follower-1",
        },
        {
          eventId: "event-3",
          groupId: "group-1",
          timestamp: "2026-08-04T12:00:00.000Z",
          severity: "INFO",
          category: "INTENT",
          message: "Trade intent created.",
          intentId: "intent-1",
          followerAccountId: "follower-1",
        },
        {
          eventId: "event-4",
          groupId: "group-1",
          timestamp: "2026-08-04T11:59:00.000Z",
          severity: "WARN",
          category: "RULE",
          message: "Follower skipped for NQ.",
          intentId: "intent-2",
          followerAccountId: "follower-1",
        },
      ],
    },
  );

  const clustered = clusterCopyGroupActivityFeed(feed);

  assert.deepEqual(
    clustered.map((item) => ({
      id: item.id,
      relatedCount: item.relatedCount,
      relatedMessages: item.relatedMessages,
    })),
    [
      {
        id: "event-1",
        relatedCount: 2,
        relatedMessages: ["Execution sent to broker.", "Trade intent created."],
      },
      {
        id: "event-4",
        relatedCount: 0,
        relatedMessages: [],
      },
    ],
  );
});

test("buildCopyGroupActivityTimeline sorts newest first, applies tone, and respects limits", () => {
  const items = buildCopyGroupActivityTimeline(
    [
      {
        eventId: "event-1",
        groupId: "group-1",
        timestamp: "2026-08-04T12:00:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Group registered.",
      },
      {
        eventId: "event-2",
        groupId: "group-1",
        timestamp: "2026-08-04T12:02:00.000Z",
        severity: "WARN",
        category: "HEALTH",
        message: "Follower reconnecting.",
      },
      {
        eventId: "event-3",
        groupId: "group-1",
        timestamp: "2026-08-04T12:01:00.000Z",
        severity: "ERROR",
        category: "EXECUTION",
        message: "Broker rejected order.",
      },
    ],
    2,
  );

  assert.deepEqual(
    items.map((item) => ({
      id: item.id,
      tone: item.tone,
    })),
    [
      {
        id: "event-2",
        tone: "warn",
      },
      {
        id: "event-3",
        tone: "danger",
      },
    ],
  );
  assert.match(items[0]?.timestampLabel ?? "", /^Aug 4,/);
  assert.match(items[1]?.timestampLabel ?? "", /^Aug 4,/);
});

test("buildCopyGroupHistorySummary condenses lifecycle and observability context", () => {
  const summary = buildCopyGroupHistorySummary(
    [
      {
        eventId: "event-1",
        groupId: "group-1",
        timestamp: "2026-08-04T12:02:00.000Z",
        severity: "ERROR",
        category: "LIFECYCLE",
        message: "Emergency stop activated: manual review required",
      },
    ],
    {
      groupId: "group-1",
      recentActivity: [],
      totalEvents: 7,
      infoEventCount: 3,
      warningEventCount: 2,
      errorEventCount: 2,
      restartRecoveryCount: 1,
      categoryCounts: {
        lifecycle: 4,
        trade: 0,
        rule: 1,
        intent: 0,
        execution: 1,
        health: 1,
      },
      lifecycleCounts: {
        started: 1,
        paused: 1,
        resumed: 1,
        stopped: 0,
        emergencyStopped: 1,
      },
      lastEventAt: "2026-08-04T12:02:00.000Z",
      lastLifecycleAt: "2026-08-04T12:02:00.000Z",
      lastLifecycleMessage: "Emergency stop activated: manual review required",
      lastErrorAt: "2026-08-04T12:02:00.000Z",
      lastErrorMessage: "Emergency stop activated: manual review required",
      lastRestartRecoveryAt: "2026-08-04T11:58:00.000Z",
      lastRestartRecoveryMessage: "Recovered copy group Alpha into STOPPED state after reload.",
    },
    {
      now: "2026-08-04T12:02:00.000Z",
    },
  );

  assert.equal(summary.lifecycleHeadline, "1 start • 1 pause • 1 resume • 1 emergency stop");
  assert.match(summary.lifecycleDetail, /Emergency stop activated: manual review required/);
  assert.equal(summary.severityLabel, "2 errors logged");
  assert.equal(summary.severityTone, "danger");
  assert.equal(summary.signalFreshnessLabel, "Fresh 0m ago");
  assert.match(summary.signalFreshnessDetail, /Latest signal logged Aug 4,/);
  assert.equal(summary.signalFreshnessTone, "ok");
  assert.equal(summary.recoveryPriorityLabel, "Review now");
  assert.match(
    summary.recoveryPriorityDetail,
    /Most recent blocker: Emergency stop activated: manual review required/,
  );
  assert.equal(summary.recoveryPriorityTone, "danger");
  assert.equal(summary.restartSignalLabel, "1 restart recovery captured");
  assert.match(
    summary.restartSignalDetail,
    /Recovered copy group Alpha into STOPPED state after reload\./,
  );
  assert.equal(summary.restartSignalTone, "ok");
  assert.deepEqual(
    summary.categoryBadges.map((badge) => ({ label: badge.label, value: badge.value })),
    [
      { label: "Lifecycle", value: 4 },
      { label: "Health", value: 1 },
      { label: "Execution", value: 1 },
      { label: "Rules", value: 1 },
      { label: "Recovery", value: 1 },
    ],
  );
});

test("buildCopyGroupHistorySummary marks warning-only histories for near-term review", () => {
  const summary = buildCopyGroupHistorySummary(
    [
      {
        eventId: "event-2",
        groupId: "group-2",
        timestamp: "2026-08-04T12:05:00.000Z",
        severity: "WARN",
        category: "HEALTH",
        message: "Follower reconnecting",
      },
    ],
    undefined,
    {
      now: "2026-08-04T14:10:00.000Z",
    },
  );

  assert.equal(summary.recoveryPriorityLabel, "Review soon");
  assert.match(
    summary.recoveryPriorityDetail,
    /Warnings or paused state should be checked before the next copy session\./,
  );
  assert.equal(summary.recoveryPriorityTone, "warn");
  assert.equal(summary.signalFreshnessLabel, "Stale 2h 5m");
  assert.match(
    summary.signalFreshnessDetail,
    /Recheck the activity feed if this group should still be active\./,
  );
  assert.equal(summary.signalFreshnessTone, "warn");
  assert.equal(summary.restartSignalLabel, "No restart recovery captured");
  assert.match(
    summary.restartSignalDetail,
    /This history window has not yet recorded a restore or recovery event after reload\./,
  );
  assert.equal(summary.restartSignalTone, "muted");
});

test("buildCopyGroupHistorySummary marks quiet histories without escalating them into blockers", () => {
  const summary = buildCopyGroupHistorySummary(
    [
      {
        eventId: "event-3",
        groupId: "group-3",
        timestamp: "2026-08-04T12:00:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Copy group Gamma paused.",
      },
    ],
    undefined,
    {
      now: "2026-08-04T12:32:00.000Z",
    },
  );

  assert.equal(summary.signalFreshnessLabel, "Quiet 32m");
  assert.match(
    summary.signalFreshnessDetail,
    /Quiet history can be normal for paused or idle groups\./,
  );
  assert.equal(summary.signalFreshnessTone, "muted");
});

test("filterCopyGroupActivityFeed keeps warnings and errors in alerts mode", () => {
  const feed = buildCopyGroupActivityFeed(
    [createGroup({ groupId: "group-1", name: "Alpha" })],
    {
      "group-1": [
        {
          eventId: "event-1",
          groupId: "group-1",
          timestamp: "2026-08-04T12:00:00.000Z",
          severity: "INFO",
          category: "TRADE",
          message: "Copied trade",
        },
        {
          eventId: "event-2",
          groupId: "group-1",
          timestamp: "2026-08-04T12:01:00.000Z",
          severity: "WARN",
          category: "HEALTH",
          message: "Master reconnecting",
        },
      ],
    },
  );

  assert.equal(filterCopyGroupActivityFeed(feed, "all").length, 2);
  assert.deepEqual(
    filterCopyGroupActivityFeed(feed, "alerts").map((item) => item.id),
    ["event-2"],
  );
});

test("describeCopyGroupPulse produces a concise runtime summary", () => {
  assert.deepEqual(
    describeCopyGroupPulse({
      totalGroups: 2,
      runningGroups: 1,
      pausedGroups: 0,
      stoppedGroups: 1,
      errorGroups: 0,
      degradedGroups: 1,
      unhealthyGroups: 0,
      connectedFollowers: 3,
      totalFollowers: 4,
      avgDispatchLatencyMs: 18.4,
    }),
    {
      headline: "1 group on watch",
      detail: "3/4 followers ready. Average dispatch latency is 18.4 ms.",
      tone: "warn",
    },
  );
});

test("buildCopySessionSignalRows condenses session state into four stable rows", () => {
  assert.deepEqual(
    buildCopySessionSignalRows({
      usingMockData: false,
      connectedAccountsCount: 3,
      totalAccountsCount: 4,
      breachedRiskCount: 1,
      warningRiskCount: 0,
      tradeCopyStatus: {
        masterConnected: true,
        followerCount: 2,
        connectedFollowerCount: 1,
        ready: false,
        followers: [{ health: "ready" }, { health: "unavailable" }],
      },
    }),
    [
      { label: "Broker session", value: "Session live", state: "ok" },
      { label: "Copy engine", value: "Needs attention", state: "alert" },
      { label: "Follower readiness", value: "1/2 ready", state: "alert" },
      { label: "Risk routing", value: "1 breached", state: "alert" },
    ],
  );
});

test("describeCopyGroupBoardState gives one clear lane status", () => {
  assert.deepEqual(
    describeCopyGroupBoardState({
      isActive: true,
      activeAccountCount: 3,
      hasMasterWarning: true,
      riskSummary: {
        blocked: false,
        warningCount: 0,
        pendingCount: 0,
      },
      riskDetail: {
        headline: "Ready to start",
        detail: "3 followers within configured limits.",
        tone: "ok",
      },
    }),
    {
      label: "Choose a master",
      detail: "Set the lead account before starting this group.",
      tone: "warn",
    },
  );

  assert.deepEqual(
    describeCopyGroupBoardState({
      isActive: false,
      activeAccountCount: 2,
      hasMasterWarning: false,
      riskSummary: {
        blocked: false,
        warningCount: 0,
        pendingCount: 0,
      },
      riskDetail: {
        headline: "Ready to start",
        detail: "2 followers within configured limits.",
        tone: "ok",
      },
    }),
    {
      label: "Paused",
      detail: "Copying is paused for this group.",
      tone: "warn",
    },
  );
});

test("describeCopyGroupRuntimeSummary explains emergency-stop and paused states", () => {
  assert.deepEqual(
    describeCopyGroupRuntimeSummary({
      status: "EMERGENCY_STOPPED",
      connectedFollowerCount: 0,
      totalFollowerCount: 2,
      emergencyStopReason: "Manual emergency stop from groups board",
      lastUpdatedAt: "2026-08-11T13:15:00.000Z",
    }),
    {
      label: "Emergency stop active",
      detail: "Manual emergency stop from groups board",
      tone: "danger",
      updatedLabel: "Aug 11, 9:15 AM",
    },
  );

  assert.deepEqual(
    describeCopyGroupRuntimeSummary({
      status: "PAUSED",
      connectedFollowerCount: 0,
      totalFollowerCount: 2,
      lastActivityMessage: "Restored paused copy group Alpha in a safe offline state.",
      lastUpdatedAt: "2026-08-11T13:20:00.000Z",
    }),
    {
      label: "Paused safely",
      detail: "Restored paused copy group Alpha in a safe offline state.",
      tone: "warn",
      updatedLabel: "Aug 11, 9:20 AM",
    },
  );
});

test("describeCopyGroupRuntimeSummary explains ready and running states", () => {
  assert.deepEqual(
    describeCopyGroupRuntimeSummary({
      status: "STOPPED",
      connectedFollowerCount: 0,
      totalFollowerCount: 2,
      lastUpdatedAt: "2026-08-11T13:25:00.000Z",
    }),
    {
      label: "Ready to start",
      detail: "Configuration saved. 0/2 followers ready.",
      tone: "muted",
      updatedLabel: "Aug 11, 9:25 AM",
    },
  );

  assert.deepEqual(
    describeCopyGroupRuntimeSummary({
      status: "STOPPED",
      connectedFollowerCount: 0,
      totalFollowerCount: 2,
      lastActivityMessage: "Recovered copy group Alpha into STOPPED state after reload.",
      lastUpdatedAt: "2026-08-11T13:27:00.000Z",
    }),
    {
      label: "Restored offline",
      detail: "Recovered copy group Alpha into STOPPED state after reload.",
      tone: "warn",
      updatedLabel: "Aug 11, 9:27 AM",
    },
  );

  assert.deepEqual(
    describeCopyGroupRuntimeSummary({
      status: "RUNNING",
      connectedFollowerCount: 1,
      totalFollowerCount: 2,
      healthStatus: "DEGRADED",
      lastActivityMessage: "Follower disconnected",
      lastUpdatedAt: "2026-08-11T13:30:00.000Z",
    }),
    {
      label: "Running on watch",
      detail: "Follower disconnected",
      tone: "warn",
      updatedLabel: "Aug 11, 9:30 AM",
    },
  );
});

test("buildCopyGroupRestartRecoveryItems surfaces recent safe reload recoveries first", () => {
  const items = buildCopyGroupRestartRecoveryItems({
    groups: [
      createGroup({
        groupId: "group-1",
        name: "Recovered Group",
        runtime: {
          groupId: "group-1",
          status: "STOPPED",
          isKillSwitchActive: false,
          masterConnected: false,
          connectedFollowerCount: 0,
          totalFollowerCount: 2,
          stoppedAt: "2026-08-11T13:27:00.000Z",
        },
      }),
      createGroup({
        groupId: "group-2",
        name: "Backup Group",
      }),
    ],
    runtimeSummariesByGroupId: {
      "group-1": {
        label: "Restored offline",
        detail: "Recovered copy group Recovered Group into STOPPED state after reload.",
        tone: "warn",
        updatedLabel: "Aug 11, 9:27 AM",
      },
    },
    activityByGroupId: {
      "group-1": [
        {
          eventId: "event-2",
          groupId: "group-1",
          timestamp: "2026-08-11T13:27:00.000Z",
          severity: "INFO",
          category: "LIFECYCLE",
          message: "Recovered copy group Recovered Group into STOPPED state after reload.",
        },
      ],
      "group-2": [
        {
          eventId: "event-1",
          groupId: "group-2",
          timestamp: "2026-08-11T13:20:00.000Z",
          severity: "INFO",
          category: "LIFECYCLE",
          message: "Restored paused copy group Backup Group in a safe offline state.",
        },
      ],
    },
  });

  assert.deepEqual(
    items.map((item) => ({
      groupId: item.groupId,
      label: item.label,
      detail: item.detail,
      tone: item.tone,
      updatedLabel: item.updatedLabel,
    })),
    [
      {
        groupId: "group-1",
        label: "Restored offline",
        detail: "Recovered copy group Recovered Group into STOPPED state after reload.",
        tone: "ok",
        updatedLabel: "Aug 11, 9:27 AM",
      },
      {
        groupId: "group-2",
        label: "Restart recovery captured",
        detail: "Restored paused copy group Backup Group in a safe offline state.",
        tone: "warn",
        updatedLabel: "Aug 11, 9:20 AM",
      },
    ],
  );
});
