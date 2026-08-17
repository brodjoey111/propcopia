import assert from "node:assert/strict";
import test from "node:test";

import type { PositionSyncOverviewResponse } from "./runtime-overview";
import {
  buildPositionSyncRepairCandidateQueue,
  buildPositionSyncQueue,
  describePositionSyncRepairStageGuidance,
  filterPositionSyncRepairCandidateQueue,
  filterPositionSyncQueue,
  summarizePositionSyncRepairCandidateQueue,
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
    disabledFollowers: 0,
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
      disabledFollowers: 0,
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
      complexityScore: 1,
      stageGuidance: "Follow through on the assigned sync window and mark the item completed after manual execution.",
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
      complexityScore: 5,
      stageGuidance: "Simulation is done. Recheck every open and multi-step adjustment before approval.",
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

test("buildPositionSyncRepairCandidateQueue stages recommendation-first sync work", () => {
  const queue = buildPositionSyncRepairCandidateQueue(overview, [
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "simulated",
      simulatedAt: "2026-08-11T18:05:00.000Z",
    },
  ], new Date("2026-08-11T18:20:00.000Z"));

  assert.deepEqual(queue, [
    {
      key: "group-1:follower-1",
      groupId: "group-1",
      groupName: "Index Leaders",
      followerAccountId: "follower-1",
      followerName: "Follower One",
      adjustmentCount: 1,
      recommendation: "auto_ready",
      recommendationLabel: "Auto-ready next",
      recommendationReason: "Low-complexity trim or sizing change.",
      complexity: "low",
      complexityLabel: "Low complexity",
      complexityScore: 1,
      workflowStatus: "not_started",
      workflowLabel: "Not started",
      stageGuidance: "Start with a quick review, then move into simulation if the current balances still line up.",
      workflowTimestamp: undefined,
      workflowTimestampLabel: "Not started yet",
      ageMinutes: 0,
      needsAttention: false,
      attentionLabel: undefined,
      operatorName: undefined,
      operatorHistory: undefined,
      stageHistory: [],
      topAdjustments: ["ESU6"],
    },
    {
      key: "group-1:follower-2",
      groupId: "group-1",
      groupName: "Index Leaders",
      followerAccountId: "follower-2",
      followerName: "Follower Two",
      adjustmentCount: 2,
      recommendation: "manual_review",
      recommendationLabel: "Manual review first",
      recommendationReason: "Includes a fresh open from flat.",
      complexity: "medium",
      complexityLabel: "Medium complexity",
      complexityScore: 5,
      workflowStatus: "simulated",
      workflowLabel: "Simulated",
      stageGuidance: "Simulation is done. Recheck every open and multi-step adjustment before approval.",
      workflowTimestamp: "2026-08-11T18:05:00.000Z",
      workflowTimestampLabel: "Simulated",
      ageMinutes: 15,
      needsAttention: false,
      attentionLabel: undefined,
      operatorName: undefined,
      operatorHistory: undefined,
      stageHistory: [
        {
          label: "Simulated",
          timestamp: "2026-08-11T18:05:00.000Z",
        },
      ],
      topAdjustments: ["NQU6", "ESU6"],
    },
  ]);
});

test("filterPositionSyncRepairCandidateQueue narrows recommendation board entries", () => {
  const queue = buildPositionSyncRepairCandidateQueue(overview, [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "reviewed",
      reviewedAt: "2026-08-11T18:04:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "approved",
      approvedAt: "2026-08-11T18:07:00.000Z",
      operatorName: "joseph",
    },
  ]);

  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "auto_ready", "").length, 1);
  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "ready_to_simulate", "").length, 1);
  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "manual_review", "").length, 1);
  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "not_started", "").length, 0);
  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "in_progress", "").length, 2);
  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "all", "manual review").length, 1);
  assert.equal(filterPositionSyncRepairCandidateQueue(queue, "all", "ESU6").length, 2);
});

test("describePositionSyncRepairStageGuidance adapts the next step by workflow stage and complexity", () => {
  assert.equal(
    describePositionSyncRepairStageGuidance({
      workflowStatus: "reviewed",
      complexity: "low",
    }),
    "Reviewed and ready for a quick simulation pass.",
  );

  assert.equal(
    describePositionSyncRepairStageGuidance({
      workflowStatus: "simulated",
      complexity: "high",
    }),
    "Simulation is done. Walk the full reversal path once more before approval.",
  );

  assert.equal(
    describePositionSyncRepairStageGuidance({
      workflowStatus: "approved",
      complexity: "medium",
    }),
    "Approved for handoff in the next operator sync window.",
  );
});

test("summarizePositionSyncRepairCandidateQueue highlights stuck and unowned staged work", () => {
  const queue = buildPositionSyncRepairCandidateQueue(overview, [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "reviewed",
      reviewedAt: "2026-08-11T18:00:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "approved",
      approvedAt: "2026-08-11T18:01:00.000Z",
      operatorName: "joseph",
    },
  ], new Date("2026-08-11T18:40:00.000Z"));

  assert.deepEqual(summarizePositionSyncRepairCandidateQueue(queue), {
    total: 2,
    autoReady: 1,
    readyToSimulate: 1,
    manualReview: 1,
    lowComplexity: 1,
    mediumComplexity: 1,
    highComplexity: 0,
    totalComplexityScore: 6,
    notStarted: 0,
    inProgress: 2,
    needsAttention: 2,
    unowned: 1,
  });
  assert.equal(queue[0]?.attentionLabel, "Reviewed candidate waiting for simulation");
  assert.equal(queue[1]?.attentionLabel, "Approved candidate waiting for queue follow-through");
});
