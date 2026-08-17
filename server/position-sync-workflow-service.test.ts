import assert from "node:assert/strict";
import test from "node:test";

import type { PersistedPositionSyncReview } from "./position-sync-review-store";
import { validatePositionSyncWorkflowTransition } from "./position-sync-workflow-service";

function createReview(
  status: PersistedPositionSyncReview["status"],
  withEvidence = true,
): PersistedPositionSyncReview {
  return {
    groupId: "group-1",
    followerAccountId: "follower-1",
    status,
    ...(withEvidence
      ? {
          simulationId: "simulation-1",
          simulationFingerprint: "fingerprint-1",
          simulationSourceGeneratedAt: "2026-08-17T14:00:00.000Z",
          simulationPlan: {
            simulationId: "simulation-1",
            planFingerprint: "fingerprint-1",
            groupId: "group-1",
            groupName: "Primary Group",
            masterAccountId: "master-1",
            followerAccountId: "follower-1",
            followerName: "Follower 1",
            sourceGeneratedAt: "2026-08-17T14:00:00.000Z",
            simulatedAt: "2026-08-17T14:01:00.000Z",
            executionMode: "SIMULATION_ONLY",
            noOrdersSubmitted: true,
            adjustmentCount: 0,
            adjustments: [],
          },
        }
      : {}),
  };
}

test("workflow allows review but requires the simulator to create simulated state", () => {
  assert.deepEqual(
    validatePositionSyncWorkflowTransition({ nextStatus: "reviewed" }),
    { valid: true },
  );
  assert.equal(
    validatePositionSyncWorkflowTransition({
      current: createReview("reviewed", false),
      nextStatus: "simulated",
    }).valid,
    false,
  );
});

test("workflow requires evidence and enforces approval, handoff, and completion order", () => {
  assert.deepEqual(
    validatePositionSyncWorkflowTransition({
      current: createReview("simulated"),
      nextStatus: "approved",
    }),
    { valid: true },
  );
  assert.deepEqual(
    validatePositionSyncWorkflowTransition({
      current: createReview("approved"),
      nextStatus: "handed_off",
    }),
    { valid: true },
  );
  assert.deepEqual(
    validatePositionSyncWorkflowTransition({
      current: createReview("handed_off"),
      nextStatus: "completed_manually",
    }),
    { valid: true },
  );

  assert.equal(
    validatePositionSyncWorkflowTransition({
      current: createReview("reviewed"),
      nextStatus: "approved",
    }).valid,
    false,
  );
  assert.equal(
    validatePositionSyncWorkflowTransition({
      current: createReview("simulated"),
      nextStatus: "handed_off",
    }).valid,
    false,
  );
  assert.equal(
    validatePositionSyncWorkflowTransition({
      current: createReview("approved"),
      nextStatus: "completed_manually",
    }).valid,
    false,
  );
});

test("workflow preserves evidence requirements for same-state updates", () => {
  assert.deepEqual(
    validatePositionSyncWorkflowTransition({
      current: createReview("simulated"),
      nextStatus: "simulated",
    }),
    { valid: true },
  );
  assert.equal(
    validatePositionSyncWorkflowTransition({
      current: createReview("simulated", false),
      nextStatus: "simulated",
    }).valid,
    false,
  );
});
