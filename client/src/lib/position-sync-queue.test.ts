import assert from "node:assert/strict";
import test from "node:test";

import type { PositionSyncOverviewResponse } from "./runtime-overview";
import {
  buildPositionSyncQueue,
  filterPositionSyncQueue,
} from "./position-sync-queue";

const overview: PositionSyncOverviewResponse = {
  generatedAt: "2026-08-11T18:00:00.000Z",
  summary: {
    totalGroups: 1,
    inSyncGroups: 0,
    outOfSyncGroups: 1,
    unavailableGroups: 0,
    outOfSyncFollowers: 2,
    unavailableFollowers: 0,
  },
  groups: [
    {
      groupId: "group-1",
      groupName: "Index Leaders",
      masterAccountId: "master-1",
      masterAccountName: "Master",
      status: "OUT_OF_SYNC",
      summary: "2 followers need position adjustments.",
      followerCount: 2,
      outOfSyncFollowers: 2,
      unavailableFollowers: 0,
      followers: [
        {
          followerAccountId: "follower-1",
          followerName: "Follower One",
          status: "OUT_OF_SYNC",
          summary: "1 adjustment needed to align with the master.",
          adjustmentCount: 1,
          adjustments: [
            {
              symbol: "ESU6",
              currentQuantity: 1,
              targetQuantity: 2,
              deltaQuantity: 1,
              action: "BUY",
              reason: "INCREASE",
            },
          ],
        },
        {
          followerAccountId: "follower-2",
          followerName: "Follower Two",
          status: "OUT_OF_SYNC",
          summary: "2 adjustments needed to align with the master.",
          adjustmentCount: 2,
          adjustments: [
            {
              symbol: "NQU6",
              currentQuantity: 0,
              targetQuantity: 1,
              deltaQuantity: 1,
              action: "BUY",
              reason: "OPEN",
            },
            {
              symbol: "ESU6",
              currentQuantity: 0,
              targetQuantity: 1,
              deltaQuantity: 1,
              action: "BUY",
              reason: "OPEN",
            },
          ],
        },
      ],
    },
  ],
};

test("buildPositionSyncQueue matches persisted reviews to live sync plan metadata", () => {
  const queue = buildPositionSyncQueue(overview, [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "reviewed",
      note: "Checked and waiting on a calmer entry.",
      reviewedAt: "2026-08-11T18:03:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "simulated",
      simulatedAt: "2026-08-11T18:05:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "handed_off",
      note: "Approved for the next manual sync window.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:08:00.000Z",
          reason: "Covering lunch break",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:09:00.000Z",
          reason: "Picked up overdue follow-up",
        },
      ],
      reviewedAt: "2026-08-11T18:03:00.000Z",
      approvedAt: "2026-08-11T18:07:00.000Z",
      handedOffAt: "2026-08-11T18:09:00.000Z",
    },
  ], new Date("2026-08-11T18:15:00.000Z"));

  assert.deepEqual(queue, [
    {
      key: "group-1:follower-1",
      groupId: "group-1",
      groupName: "Index Leaders",
      followerAccountId: "follower-1",
      followerName: "Follower One",
      status: "handed_off",
      note: "Approved for the next manual sync window.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:08:00.000Z",
          reason: "Covering lunch break",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:09:00.000Z",
          reason: "Picked up overdue follow-up",
        },
      ],
      reviewedAt: "2026-08-11T18:03:00.000Z",
      simulatedAt: undefined,
      approvedAt: "2026-08-11T18:07:00.000Z",
      handedOffAt: "2026-08-11T18:09:00.000Z",
      completedManuallyAt: undefined,
      summary: "1 adjustment needed to align with the master.",
      adjustmentCount: 1,
      topAdjustments: ["ESU6"],
      ageMinutes: 6,
      needsAttention: false,
      attentionLabel: undefined,
      reassignmentCount: 1,
      latestAssignmentReason: "Picked up overdue follow-up",
    },
    {
      key: "group-1:follower-2",
      groupId: "group-1",
      groupName: "Index Leaders",
      followerAccountId: "follower-2",
      followerName: "Follower Two",
      status: "simulated",
      note: undefined,
      operatorName: undefined,
      operatorHistory: undefined,
      reviewedAt: undefined,
      simulatedAt: "2026-08-11T18:05:00.000Z",
      approvedAt: undefined,
      handedOffAt: undefined,
      completedManuallyAt: undefined,
      summary: "2 adjustments needed to align with the master.",
      adjustmentCount: 2,
      topAdjustments: ["NQU6", "ESU6"],
      ageMinutes: 10,
      needsAttention: false,
      attentionLabel: undefined,
      reassignmentCount: 0,
      latestAssignmentReason: undefined,
    },
  ]);
});

test("filterPositionSyncQueue narrows queue entries by status and search text", () => {
  const queue = buildPositionSyncQueue(overview, [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "completed_manually",
      note: "Checked ES before open.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:04:00.000Z",
          reason: "Started manual catch-up",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:06:00.000Z",
          reason: "Finished manual follow-through",
        },
      ],
      approvedAt: "2026-08-11T18:03:00.000Z",
      handedOffAt: "2026-08-11T18:04:00.000Z",
      completedManuallyAt: "2026-08-11T18:06:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "simulated",
      simulatedAt: "2026-08-11T18:05:00.000Z",
    },
  ]);

  assert.equal(filterPositionSyncQueue(queue, "reviewed", "").length, 0);
  assert.equal(filterPositionSyncQueue(queue, "simulated", "").length, 1);
  assert.equal(filterPositionSyncQueue(queue, "approved", "").length, 0);
  assert.equal(filterPositionSyncQueue(queue, "handed_off", "").length, 0);
  assert.equal(filterPositionSyncQueue(queue, "completed_manually", "").length, 1);
  assert.equal(filterPositionSyncQueue(queue, "all", "es").length, 2);
  assert.equal(filterPositionSyncQueue(queue, "all", "calm").length, 0);
  assert.equal(filterPositionSyncQueue(queue, "all", "Follower Two").length, 1);
});

test("buildPositionSyncQueue flags stale approved and handed-off items that need follow-up", () => {
  const queue = buildPositionSyncQueue(overview, [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "approved",
      approvedAt: "2026-08-11T18:00:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "handed_off",
      approvedAt: "2026-08-11T18:01:00.000Z",
      handedOffAt: "2026-08-11T18:05:00.000Z",
    },
  ], new Date("2026-08-11T18:40:00.000Z"));

  assert.equal(queue[0]?.needsAttention, true);
  assert.equal(queue[0]?.attentionLabel, "Handoff waiting for completion");
  assert.equal(queue[1]?.needsAttention, true);
  assert.equal(queue[1]?.attentionLabel, "Approval waiting for handoff");
});
