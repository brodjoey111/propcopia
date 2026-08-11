import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("settings page exposes persisted activity queue preferences", () => {
  const source = readFileSync("client/src/pages/settings.tsx", "utf8");

  assert.match(source, /activityQueueSort/);
  assert.match(source, /activityQueueAuditFocus/);
  assert.match(source, /copyGroupHealthReviewFilter/);
  assert.match(source, /Operations/);
  assert.match(source, /Activity queue default sort/);
  assert.match(source, /Activity queue default audit view/);
  assert.match(source, /Copy-group board default review view/);
  assert.match(source, /select-activity-queue-sort/);
  assert.match(source, /select-activity-queue-audit-focus/);
  assert.match(source, /select-copy-group-health-review-filter/);
  assert.match(source, /Newest first/);
  assert.match(source, /Oldest first/);
  assert.match(source, /Owner/);
  assert.match(source, /Reassignments/);
  assert.match(source, /All items/);
  assert.match(source, /All issues/);
  assert.match(source, /Overdue/);
  assert.match(source, /Unassigned/);
  assert.match(source, /Reassigned/);
  assert.match(source, /Unreviewed/);
  assert.match(source, /Reviewed/);
  assert.match(source, /Stale reviews/);
  assert.match(source, /Recurring issues/);
  assert.match(source, /activityQueueSort,\s*activityQueueAuditFocus,\s*copyGroupHealthReviewFilter,/);
});
