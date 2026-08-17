import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard position sync workflow hook centralizes review notes and staged sync actions", () => {
  const source = readFileSync("client/src/hooks/use-dashboard-position-sync-workflow.ts", "utf8");

  assert.match(source, /useDashboardPositionSyncWorkflow/);
  assert.match(source, /const \[positionSyncReviewNotes, setPositionSyncReviewNotes\] = useState<Record<string, string>>\(/);
  assert.match(source, /buildPositionSyncWorkflowKey/);
  assert.match(source, /buildPositionSyncWorkflowUpdate/);
  assert.match(source, /handlePositionSyncReview/);
  assert.match(source, /handlePositionSyncSimulation/);
  assert.match(source, /handleRepairCandidateTakeOwnership/);
  assert.match(source, /handleRepairCandidateAdvance/);
  assert.match(source, /nextStatus: "reviewed"/);
  assert.match(source, /simulatePositionSyncMutation\.mutate/);
  assert.match(source, /follower\.status === "OUT_OF_SYNC"/);
  assert.match(source, /nextStatus: "approved"/);
  assert.match(source, /"Reassigned staged sync ownership"/);
  assert.match(source, /"Claimed staged sync ownership"/);
  assert.match(source, /appendOperatorAssignment: true/);
  assert.match(source, /entry\.workflowStatus === "not_started"/);
  assert.match(source, /entry\.workflowStatus === "reviewed"/);
  assert.match(source, /entry\.workflowStatus === "simulated"/);
});
