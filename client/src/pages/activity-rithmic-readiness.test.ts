import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity page wires shared Rithmic readiness recheck actions into the operator workspace", () => {
  const source = readFileSync("client/src/pages/activity.tsx", "utf8");

  assert.match(source, /ActivityRithmicReadinessBoard/);
  assert.match(source, /rithmicReadinessReviewData/);
  assert.match(source, /rithmicReadinessReviewsByStoryKey/);
  assert.match(source, /rithmicReadinessFollowUpItems/);
  assert.match(source, /filteredRithmicReadinessFollowUpItems/);
  assert.match(source, /reviewedRithmicReadinessCount/);
  assert.match(source, /ownedRithmicReadinessCount/);
  assert.match(source, /unownedRithmicReadinessCount/);
  assert.match(source, /reassignedRithmicReadinessCount/);
  assert.match(source, /selectedRithmicReadinessStoryKeys/);
  assert.match(source, /rithmicReadinessNotes/);
  assert.match(source, /saveRithmicReadinessReviewsMutation/);
  assert.match(source, /recheckRithmicReadinessMutation/);
  assert.match(source, /handleRithmicReadinessRecheck/);
  assert.match(source, /handleBulkRecheckRithmicReadinessItems/);
  assert.match(source, /Rithmic Readiness Rechecked/);
  assert.match(source, /Rithmic Re-check Failed/);
  assert.match(source, /Bulk Rithmic Re-check Failed/);
  assert.match(source, /onBulkRecheck={handleBulkRecheckRithmicReadinessItems}/);
  assert.match(source, /onRecheck={handleRithmicReadinessRecheck}/);
});
