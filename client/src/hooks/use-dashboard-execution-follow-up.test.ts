import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard execution follow-up hook centralizes recheck, ownership, notes, and review workflow", () => {
  const source = readFileSync("client/src/hooks/use-dashboard-execution-follow-up.ts", "utf8");

  assert.match(source, /useDashboardExecutionFollowUp/);
  assert.match(source, /const \[reviewNotes, setReviewNotes\] = useState<Record<string, string>>\(\{\}\)/);
  assert.match(source, /apiRequest\("POST", "\/api\/runtime\/dashboard-overview\/recheck"\)/);
  assert.match(source, /refreshDashboardRuntimeOverview/);
  assert.match(source, /buildExecutionFollowUpReviewPayload/);
  assert.match(source, /handleExecutionRecoveryRecheck/);
  assert.match(source, /handleExecutionRecoveryItemRecheck/);
  assert.match(source, /handleExecutionRecoveryItemReview/);
  assert.match(source, /handleExecutionRecoveryItemTakeOwnership/);
  assert.match(source, /handleExecutionRecoveryItemSaveNote/);
  assert.match(source, /handleExecutionRecoveryItemReopen/);
  assert.match(source, /"Reviewed execution follow-up item"/);
  assert.match(source, /"Reassigned execution follow-up ownership"/);
  assert.match(source, /"Claimed execution follow-up"/);
  assert.match(source, /"Reopened execution follow-up item"/);
  assert.match(source, /delete next\[item\.historyId\]/);
});
