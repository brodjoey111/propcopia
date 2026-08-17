import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("notifications page exposes reviewed controls for Rithmic readiness alerts", () => {
  const source = readFileSync("client/src/pages/notifications.tsx", "utf8");

  assert.match(source, /Rithmic Readiness Follow-Up/);
  assert.match(source, /Shared reconnect review note/);
  assert.match(source, /Re-check readiness/);
  assert.match(source, /Re-checking\.\.\./);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Reopened Rithmic readiness alert/);
});
