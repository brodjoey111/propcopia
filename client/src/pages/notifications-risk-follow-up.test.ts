import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("notifications page surfaces the risk follow-up queue above the inbox list", () => {
  const source = readFileSync("client/src/pages/notifications.tsx", "utf8");

  assert.match(source, /RISK_FOLLOW_UP_REVIEWED_STORAGE_KEY/);
  assert.match(source, /loadReviewedRiskFollowUpItems/);
  assert.match(source, /reviewedRiskFollowUpItems/);
  assert.match(source, /reviewedRiskFollowUpCount/);
  assert.match(source, /parseRiskFollowUpReviewsJson/);
  assert.match(source, /useQuery<\{\s*success: boolean;\s*reviews: RiskFollowUpReviewEntry\[];/);
  assert.match(source, /saveRiskFollowUpReviewsMutation/);
  assert.match(source, /"\/api\/risk-follow-up\/reviews"/);
  assert.match(source, /saveRiskFollowUpPreferencesMutation/);
  assert.match(source, /riskFollowUpReviewsJson/);
  assert.match(source, /apiRequest\("PATCH", "\/api\/user\/settings", settings\)/);
  assert.match(source, /appendRiskFollowUpOperatorAssignment/);
  assert.match(source, /Owner:/);
  assert.match(source, /riskFollowUpNotes/);
  assert.match(source, /Shared operator note/);
  assert.match(source, /handleTakeOwnership/);
  assert.match(source, /handleSaveRiskFollowUpNote/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Save note/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /buildRiskNotificationFollowUpQueue/);
  assert.match(source, /riskFollowUpItems/);
  assert.match(source, /Risk Follow-Up/);
  assert.match(source, /Manual risk review queue/);
  assert.match(source, /Prioritized risk items that should be reviewed before the next copy session starts\./);
  assert.match(source, /handleMarkRiskFollowUpReviewed/);
  assert.match(source, /handleReopenRiskFollowUpItem/);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Reopen/);
  assert.match(source, /Reviewed at /);
  assert.match(source, /item\.actionLabel/);
});
