import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("notifications follow-up panels keep sync, risk, and execution inbox controls", () => {
  const source = readFileSync("client/src/components/notifications-follow-up-panels.tsx", "utf8");

  assert.match(source, /Sync Repair Follow-Up/);
  assert.match(source, /Staged sync watchlist/);
  assert.match(source, /Owner needed before the next manual sync step\./);
  assert.match(source, /Take ownership/);
  assert.match(source, /Start review/);
  assert.match(source, /Simulate/);
  assert.match(source, /Approve/);
  assert.match(source, /Risk Follow-Up/);
  assert.match(source, /Manual risk review queue/);
  assert.match(source, /Prioritized risk items that should be reviewed before the next copy session starts\./);
  assert.match(source, /Shared operator note/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Reopen/);
  assert.match(source, /Execution Follow-Up/);
  assert.match(source, /Manual execution recovery queue/);
  assert.match(source, /Review failed orders and recheck stale or partial lifecycle items from the inbox surface\./);
  assert.match(source, /Execution review note/);
  assert.match(source, /Recheck/);
  assert.match(source, /Reviewed at/);
  assert.match(source, /ExecutionFollowUpSignalSummary/);
  assert.match(source, /checkpoint=\{item\.checkpoint\}/);
  assert.match(source, /recoveryWindow=\{item\.recoveryWindow\}/);
});
