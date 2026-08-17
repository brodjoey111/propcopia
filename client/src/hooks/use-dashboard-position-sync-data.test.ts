import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard position sync hook centralizes dashboard-specific sync view shaping", () => {
  const source = readFileSync("client/src/hooks/use-dashboard-position-sync-data.ts", "utf8");

  assert.match(source, /usePositionSyncReviewData/);
  assert.match(source, /selectedGroupId\?: string \| null/);
  assert.match(source, /showPositionSyncDetail: boolean/);
  assert.match(source, /usingMockData\?: boolean/);
  assert.match(source, /describePositionSyncOverview/);
  assert.match(source, /buildPositionSyncSummaryCards/);
  assert.match(source, /sortPositionSyncGroups/);
  assert.match(source, /buildPositionSyncReview/);
  assert.match(source, /positionSyncRepairBoardSummary/);
  assert.match(source, /positionSyncDetailOverview/);
  assert.match(source, /positionSyncRepairAttentionItems/);
  assert.match(source, /workflowStatus !== "not_started"/);
});
