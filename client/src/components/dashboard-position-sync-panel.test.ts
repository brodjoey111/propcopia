import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard position sync panel keeps staged repair and review controls", () => {
  const source = readFileSync("client/src/components/dashboard-position-sync-panel.tsx", "utf8");

  assert.match(source, /Position Sync/);
  assert.match(source, /Ready to Simulate/);
  assert.match(source, /Staged Alerts/);
  assert.match(source, /Owner needed/);
  assert.match(source, /Take ownership/);
  assert.match(source, /Start review/);
  assert.match(source, /Simulate/);
  assert.match(source, /Approve/);
  assert.match(source, /Show all groups/);
  assert.match(source, /Simulate sync/);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /follower\.repairRecommendation\.label/);
  assert.match(source, /follower\.repairRecommendation\.reason/);
  assert.match(source, /follower\.repairRecommendation\.complexityLabel/);
  assert.match(source, /entry\.complexityLabel/);
  assert.match(source, /describePositionSyncSimulationGuidance/);
  assert.match(source, /entry\.stageGuidance/);
  assert.match(source, /High Complexity/);
  assert.match(source, /Workload Score/);
  assert.match(source, /Approved/);
  assert.match(source, /Handed Off/);
  assert.match(source, /Completed Manually/);
  assert.match(source, /simulationFingerprint/);
  assert.match(source, /No broker orders submitted/);
  assert.match(source, /Operator owner:/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /Latest ownership reason:/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Load position-sync detail when you want per-group sync status and follower review items\./);
});
