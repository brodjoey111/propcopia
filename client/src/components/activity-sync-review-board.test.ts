import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity sync review board keeps shared queue controls and operator actions together", () => {
  const source = readFileSync("client/src/components/activity-sync-review-board.tsx", "utf8");

  assert.match(source, /ActivitySyncReviewBoard/);
  assert.match(source, /Sync Review Queue/);
  assert.match(source, /Shared review and simulation queue/);
  assert.match(source, /Search by group, follower, note, or symbol/);
  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /Audit: Overdue/);
  assert.match(source, /All \(\$\{props\.positionSyncQueue\.length\}\)/);
  assert.match(source, /Reviewed \(\$\{props\.reviewedSyncCount\}\)/);
  assert.match(source, /Simulated \(\$\{props\.simulatedSyncCount\}\)/);
  assert.match(source, /Approved \(\$\{props\.approvedSyncCount\}\)/);
  assert.match(source, /Handed Off \(\$\{props\.handedOffSyncCount\}\)/);
  assert.match(source, /Completed \(\$\{props\.completedManuallySyncCount\}\)/);
  assert.match(source, /No sync review items match the current filters yet\./);
  assert.match(source, /Next step:/);
  assert.match(source, /Compact view keeps the queue lighter\./);
  assert.match(source, /Review note:/);
  assert.match(source, /Operator owner:/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Needs follow-up:/);
  assert.match(source, /Optional ownership reason/);
  assert.match(source, /Approve for manual execution/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Hand off for manual execution/);
  assert.match(source, /Mark completed manually/);
  assert.match(source, /Timestamp unavailable/);
});
