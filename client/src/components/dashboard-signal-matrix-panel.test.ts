import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard signal matrix panel keeps routing health and risk follow-up summaries", () => {
  const source = readFileSync("client/src/components/dashboard-signal-matrix-panel.tsx", "utf8");

  assert.match(source, /Signal Matrix/);
  assert.match(source, /Connection and routing health/);
  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /OK/);
  assert.match(source, /Alert/);
  assert.match(source, /Watch/);
  assert.match(source, /Not started/);
  assert.match(source, /Risk Follow-Up/);
  assert.match(source, /manual risk decision before the next copy session/);
  assert.match(source, /Compact view keeps routing status easy to scan\. Switch to detailed view for the full risk follow-up context\./);
  assert.match(source, /Hold/);
  assert.match(source, /Review/);
  assert.match(source, /Pending/);
  assert.match(source, /Why this revamp is different/);
  assert.match(source, /high-end operations board instead of a generic analytics dashboard/);
  assert.match(source, /Needs attention/);
  assert.match(source, /Reconnecting/);
});
