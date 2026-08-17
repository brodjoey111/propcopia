import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity sync repair board hook centralizes staged repair filters, selection, and workflow actions", () => {
  const source = readFileSync("client/src/hooks/use-activity-sync-repair-board.ts", "utf8");

  assert.match(source, /filterPositionSyncRepairCandidateQueue/);
  assert.match(source, /repairCandidateFilter/);
  assert.match(source, /repairCandidateSearch/);
  assert.match(source, /selectedRepairCandidateKeys/);
  assert.match(source, /repairCandidateNotes/);
  assert.match(source, /handleToggleRepairCandidateSelection/);
  assert.match(source, /handleSelectAllVisibleRepairCandidates/);
  assert.match(source, /handleSelectAutoReadyRepairCandidates/);
  assert.match(source, /handleClearRepairCandidateSelection/);
  assert.match(source, /handleBulkReviewRepairCandidates/);
  assert.match(source, /handleBulkSimulateRepairCandidates/);
  assert.match(source, /handleBulkTakeRepairCandidateOwnership/);
  assert.match(source, /handleBulkApproveRepairCandidates/);
  assert.match(source, /handleSaveRepairCandidateNote/);
  assert.match(source, /Claimed staged sync repair ownership/);
  assert.match(source, /Reassigned staged sync repair ownership/);
  assert.match(source, /nextStatus: "reviewed"/);
  assert.match(source, /options\.simulatePositionSync/);
  assert.match(source, /entry\.workflowStatus === "simulated"/);
  assert.match(source, /nextStatus: "approved"/);
  assert.match(source, /appendOperatorAssignment: true/);
});
