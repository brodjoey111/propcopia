import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("accounts position sync review hook centralizes workflow saves, notes, and ownership actions", () => {
  const source = readFileSync("client/src/hooks/use-accounts-position-sync-review.ts", "utf8");

  assert.match(source, /useAccountsPositionSyncReview/);
  assert.match(source, /savePositionSyncWorkflowMutation/);
  assert.match(source, /apiRequest\("POST", "\/api\/position-sync\/reviews"/);
  assert.match(source, /queryClient\.setQueryData/);
  assert.match(source, /buildPositionSyncWorkflowKey/);
  assert.match(source, /buildPositionSyncWorkflowUpdate/);
  assert.match(source, /positionSyncReviewNotes/);
  assert.match(source, /positionSyncAssignmentReasons/);
  assert.match(source, /handleApprovePositionSyncEntry/);
  assert.match(source, /handleTakePositionSyncOwnership/);
  assert.match(source, /handleHandOffPositionSyncEntry/);
  assert.match(source, /handleCompletePositionSyncEntry/);
  assert.match(source, /nextStatus: "approved"/);
  assert.match(source, /nextStatus: input\.workflowEntry\?\.status \?\? "reviewed"/);
  assert.match(source, /nextStatus: "handed_off"/);
  assert.match(source, /nextStatus: "completed_manually"/);
  assert.match(source, /appendOperatorAssignment: true/);
  assert.match(source, /"Reassigned ownership"/);
  assert.match(source, /"Claimed sync follow-up"/);
  assert.match(source, /"Assigned for manual execution"/);
  assert.match(source, /"Completed manual follow-through"/);
});
