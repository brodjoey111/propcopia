import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity sync repair board keeps staged workflow controls and timelines", () => {
  const source = readFileSync("client/src/components/activity-sync-repair-board.tsx", "utf8");

  assert.match(source, /Sync Repair Board/);
  assert.match(source, /Stage the next sync repair work/);
  assert.match(source, /Search by group, follower, recommendation, or symbol/);
  assert.match(source, /Select visible/);
  assert.match(source, /Ready to Simulate/);
  assert.match(source, /Select ready to simulate/);
  assert.match(source, /Clear selection/);
  assert.match(source, /Mark selected reviewed/);
  assert.match(source, /Simulate selected/);
  assert.match(source, /Take ownership of selected/);
  assert.match(source, /Approve selected/);
  assert.match(source, /Low Complexity/);
  assert.match(source, /Medium Complexity/);
  assert.match(source, /High Complexity/);
  assert.match(source, /Workload Score/);
  assert.match(source, /Shared repair-stage note/);
  assert.match(source, /Save note/);
  assert.match(source, /Start in queue/);
  assert.match(source, /Open in queue/);
  assert.match(source, /entry\.complexityLabel/);
  assert.match(source, /describePositionSyncSimulationGuidance/);
  assert.match(source, /entry\.stageGuidance/);
  assert.match(source, /Current note saved to shared sync workflow\./);
  assert.match(source, /Stage Timeline/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Alert: /);
  assert.match(source, /No sync repair candidates match the current search right now\./);
});
