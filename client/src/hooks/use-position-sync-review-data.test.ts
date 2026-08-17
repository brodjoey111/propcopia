import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("position sync review data hook centralizes shared queries and derived repair state", () => {
  const source = readFileSync("client/src/hooks/use-position-sync-review-data.ts", "utf8");

  assert.match(source, /"\/api\/position-sync\/plans"/);
  assert.match(source, /"\/api\/position-sync\/reviews"/);
  assert.match(source, /groupId\?: string \| null/);
  assert.match(source, /encodeURIComponent\(selectedGroupId\)/);
  assert.match(source, /loadPositionSyncResource/);
  assert.match(source, /toPositionSyncWorkflowState/);
  assert.match(source, /buildPositionSyncRepairCandidateQueue/);
  assert.match(source, /summarizePositionSyncRepairCandidateQueue/);
  assert.match(source, /summarizePositionSyncRepairOpportunities/);
  assert.match(source, /positionSyncWorkflowState/);
  assert.match(source, /positionSyncRepairCandidates/);
  assert.match(source, /positionSyncRepairBoardSummary/);
  assert.match(source, /positionSyncRepairSummary/);
});
