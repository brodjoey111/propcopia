import assert from "node:assert/strict";
import test from "node:test";

import {
  appendPositionSyncOperatorAssignment,
  buildPositionSyncWorkflowKey,
  toPositionSyncWorkflowState,
} from "./position-sync-workflow";

test("buildPositionSyncWorkflowKey creates a stable group and follower key", () => {
  assert.equal(
    buildPositionSyncWorkflowKey("group-1", "follower-2"),
    "group-1:follower-2",
  );
});

test("toPositionSyncWorkflowState maps saved review rows into a keyed lookup", () => {
  assert.deepEqual(
    toPositionSyncWorkflowState([
      {
        groupId: "group-1",
        followerAccountId: "follower-1",
        status: "reviewed",
        note: "Checked the mismatch and left it for the next session.",
        reviewedAt: "2026-08-11T16:00:00.000Z",
      },
      {
        groupId: "group-2",
        followerAccountId: "follower-3",
        status: "simulated",
        simulatedAt: "2026-08-11T16:05:00.000Z",
      },
    ]),
    {
      "group-1:follower-1": {
        status: "reviewed",
        note: "Checked the mismatch and left it for the next session.",
        operatorName: undefined,
        operatorHistory: undefined,
        reviewedAt: "2026-08-11T16:00:00.000Z",
        simulatedAt: undefined,
        approvedAt: undefined,
        handedOffAt: undefined,
        completedManuallyAt: undefined,
      },
      "group-2:follower-3": {
        status: "simulated",
        note: undefined,
        operatorName: undefined,
        operatorHistory: undefined,
        reviewedAt: undefined,
        simulatedAt: "2026-08-11T16:05:00.000Z",
        approvedAt: undefined,
        handedOffAt: undefined,
        completedManuallyAt: undefined,
      },
    },
  );
});

test("appendPositionSyncOperatorAssignment appends only when ownership changes", () => {
  assert.deepEqual(
    appendPositionSyncOperatorAssignment(
      undefined,
      "joseph",
      "2026-08-11T16:00:00.000Z",
      "Claimed queue item",
    ),
    [
      {
        operatorName: "joseph",
        assignedAt: "2026-08-11T16:00:00.000Z",
        reason: "Claimed queue item",
      },
    ],
  );

  assert.deepEqual(
    appendPositionSyncOperatorAssignment(
      [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T16:00:00.000Z",
          reason: "Claimed queue item",
        },
      ],
      "joseph",
      "2026-08-11T16:05:00.000Z",
      "Still working it",
    ),
    [
      {
        operatorName: "joseph",
        assignedAt: "2026-08-11T16:00:00.000Z",
        reason: "Claimed queue item",
      },
    ],
  );
});
