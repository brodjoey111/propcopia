import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard rithmic readiness panel keeps saved-session follow-up actions together", () => {
  const source = readFileSync("client/src/components/dashboard-rithmic-readiness-panel.tsx", "utf8");

  assert.match(source, /Rithmic Readiness/);
  assert.match(source, /Saved-session follow-up/);
  assert.match(source, /Reviewed \{props\.reviewedRithmicReadinessCount\}/);
  assert.match(source, /Owned \{props\.ownedRithmicReadinessCount\}/);
  assert.match(source, /Unowned \{props\.unownedRithmicReadinessCount\}/);
  assert.match(source, /Reassigned \{props\.reassignedRithmicReadinessCount\}/);
  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /readinessByAccountId/);
  assert.match(source, /Reconnect proof needed/);
  assert.match(source, /Session offline/);
  assert.match(source, /Reconnect drift:/);
  assert.match(source, /readiness\?\.statusLabel/);
  assert.match(source, /Shared reconnect review note/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Save note/);
  assert.match(source, /Re-check open items/);
  assert.match(source, /Re-checking open items\.\.\./);
  assert.match(source, /Re-check readiness/);
  assert.match(source, /Re-checking\.\.\./);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Reopen/);
  assert.match(source, /All saved Rithmic accounts are ready for the next session check right now\./);
});
