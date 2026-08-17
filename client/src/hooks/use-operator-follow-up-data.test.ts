import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("operator follow-up hook centralizes shared risk and execution queue shaping", () => {
  const source = readFileSync("client/src/hooks/use-operator-follow-up-data.ts", "utf8");

  assert.match(source, /buildAccountRiskFollowUpQueue/);
  assert.match(source, /buildRiskNotificationFollowUpQueue/);
  assert.match(source, /buildRiskFollowUpItems/);
  assert.match(source, /filterRiskFollowUpItems/);
  assert.match(source, /summarizeRiskFollowUpItems/);
  assert.match(source, /buildExecutionRecoveryFollowUpQueue/);
  assert.match(source, /mergeExecutionFollowUpItems/);
  assert.match(source, /filterExecutionFollowUpItems/);
  assert.match(source, /summarizeExecutionFollowUpItems/);
  assert.match(source, /buildRithmicReadinessFollowUpItems/);
  assert.match(source, /filterRithmicReadinessFollowUpItems/);
  assert.match(source, /summarizeRithmicReadinessFollowUpItems/);
  assert.match(source, /visibleRiskNotificationItems/);
  assert.match(source, /visibleExecutionFollowUpItems/);
  assert.match(source, /visibleRithmicReadinessFollowUpItems/);
  assert.match(source, /reviewedRiskFollowUpItems\?: Record<string, string>/);
  assert.match(source, /rithmicReadinessReviews\?: RithmicReadinessReviewEntry\[]/);
});
