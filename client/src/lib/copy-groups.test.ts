import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCopyGroupActivityFeed,
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
    })),
    [
      { id: "event-3", groupName: "Beta", type: "error" },
      { id: "event-2", groupName: "Beta", type: "connection" },
      { id: "event-1", groupName: "Alpha", type: "trade" },
    ],
  );
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
