import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity risk follow-up board keeps shared risk queue controls", () => {
  const source = readFileSync("client/src/components/activity-risk-follow-up-board.tsx", "utf8");

  assert.match(source, /Risk Follow-Up/);
  assert.match(source, /Shared risk review queue/);
  assert.match(source, /Reviewed \{props\.reviewedRiskFollowUpCount\}/);
  assert.match(source, /Owned \{props\.ownedRiskFollowUpCount\}/);
  assert.match(source, /Unowned \{props\.unownedRiskFollowUpCount\}/);
  assert.match(source, /Reassigned \{props\.reassignedRiskFollowUpCount\}/);
  assert.match(source, /Search by account, issue, owner, or note/);
  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /Select visible/);
  assert.match(source, /Select unowned/);
  assert.match(source, /Clear selection/);
  assert.match(source, /Take ownership of selected/);
  assert.match(source, /Mark selected reviewed/);
  assert.match(source, /Reopen selected/);
  assert.match(source, /Shared risk note/);
  assert.match(source, /Compact view keeps the queue lighter\. Switch to detailed view for notes and ownership history\./);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Save note/);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Reopen/);
  assert.match(source, /No risk follow-up items match the current search right now\./);
});
