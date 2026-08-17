import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity copy-group alert board keeps queue controls and freshness cues together", () => {
  const source = readFileSync("client/src/components/activity-copy-group-alert-board.tsx", "utf8");

  assert.match(source, /ActivityCopyGroupAlertBoard/);
  assert.match(source, /Copy Group Alert History/);
  assert.match(source, /Shared alert stream/);
  assert.match(source, /New Since Review/);
  assert.match(source, /Search alert stories, groups, owners, or notes/);
  assert.match(source, /Select visible/);
  assert.match(source, /Select unowned/);
  assert.match(source, /Clear selection/);
  assert.match(source, /Take ownership of selected/);
  assert.match(source, /Acknowledge selected/);
  assert.match(source, /No shared copy-group alerts match the current queue filter right now\./);
  assert.match(source, /Story key:/);
  assert.match(source, /Owner: /);
  assert.match(source, /Status: /);
  assert.match(source, /Restart recovery:/);
  assert.match(source, /Shared alert note/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Update acknowledgment/);
  assert.match(source, /Acknowledge/);
  assert.match(source, /Reopen/);
});
