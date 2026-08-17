import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity rithmic readiness board keeps shared reconnect review controls together", () => {
  const source = readFileSync("client/src/components/activity-rithmic-readiness-board.tsx", "utf8");

  assert.match(source, /Rithmic Readiness/);
  assert.match(source, /Shared reconnect and review queue/);
  assert.match(source, /Reviewed \{props\.reviewedRithmicReadinessCount\}/);
  assert.match(source, /Owned \{props\.ownedRithmicReadinessCount\}/);
  assert.match(source, /Unowned \{props\.unownedRithmicReadinessCount\}/);
  assert.match(source, /Reassigned \{props\.reassignedRithmicReadinessCount\}/);
  assert.match(source, /Search by account, blocker, owner, or note/);
  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /Select visible/);
  assert.match(source, /Select unowned/);
  assert.match(source, /Clear selection/);
  assert.match(source, /Take ownership of selected/);
  assert.match(source, /Re-check selected/);
  assert.match(source, /Mark selected reviewed/);
  assert.match(source, /Reopen selected/);
  assert.match(source, /Shared reconnect review note/);
  assert.match(source, /Compact view keeps the queue lighter\. Switch to detailed view for notes and ownership history\./);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Save note/);
  assert.match(source, /Re-check readiness/);
  assert.match(source, /Re-checking\.\.\./);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Reopen/);
  assert.match(source, /No Rithmic readiness items match the current search right now\./);
});
