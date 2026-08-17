import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity sync review board hook centralizes queue preferences, filtering, and workflow actions", () => {
  const source = readFileSync("client/src/hooks/use-activity-sync-review-board.ts", "utf8");

  assert.match(source, /ACTIVITY_QUEUE_SORT_STORAGE_KEY/);
  assert.match(source, /ACTIVITY_QUEUE_AUDIT_FOCUS_STORAGE_KEY/);
  assert.match(source, /loadStoredQueueSort/);
  assert.match(source, /loadStoredQueueAuditFocus/);
  assert.match(source, /normalizeQueueSort/);
  assert.match(source, /normalizeQueueAuditFocus/);
  assert.match(source, /filterPositionSyncQueue/);
  assert.match(source, /sortedAuditFocusedQueue/);
  assert.match(source, /overdueSyncEntries/);
  assert.match(source, /unassignedSyncEntries/);
  assert.match(source, /reassignedSyncEntries/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /saveActivityPreferences/);
  assert.match(source, /buildPositionSyncWorkflowUpdate/);
  assert.match(source, /handleApproveSyncQueueEntry/);
  assert.match(source, /handleHandOffSyncQueueEntry/);
  assert.match(source, /handleCompleteSyncQueueEntry/);
  assert.match(source, /handleTakeOwnership/);
  assert.match(source, /handleSelectAuditFocus/);
  assert.match(source, /handleOpenRepairCandidateInQueue/);
  assert.match(source, /setQueueFilter\("reviewed"\)/);
  assert.match(source, /setQueueSearch\(entry\.followerName\)/);
});
