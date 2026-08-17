import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("accounts page surfaces reconnect drift and saved readiness gaps for Rithmic accounts", () => {
  const source = readFileSync("client/src/pages/accounts.tsx", "utf8");

  assert.match(source, /buildRithmicReadinessViewItems/);
  assert.match(source, /rithmicReadinessViewItems/);
  assert.match(source, /Rithmic Readiness/);
  assert.match(source, /reconnect proofs stale/);
  assert.match(source, /Session active/);
  assert.match(source, /Session offline/);
  assert.match(source, /item\.reconnectBadgeLabel/);
  assert.match(source, /item\.reconnectBadgeTone/);
  assert.match(source, /item\.statusLabel/);
  assert.match(source, /Reconnect drift:/);
  assert.match(source, /Re-check readiness/);
});
