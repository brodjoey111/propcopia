import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard defers lower detail queries until after the initial paint", () => {
  const source = readFileSync("client/src/pages/dashboard.tsx", "utf8");

  assert.match(source, /const \[loadDetailSections, setLoadDetailSections\] = useState\(false\)/);
  assert.match(source, /window\.setTimeout\(\(\) => \{\s*setLoadDetailSections\(true\);/);
  assert.match(
    source,
    /enabled:\s*[\s\S]*?!!authData\?\.user\?\.id\s*&&[\s\S]*?hasConnectedAccounts\s*&&[\s\S]*?loadDetailSections\s*&&[\s\S]*?\(showAccountRoster \|\| showOpenPositions\)/,
  );
  assert.match(source, /setShowAccountRoster\(\(current\) => !current\)/);
  assert.match(source, /setShowOpenPositions\(\(current\) => !current\)/);
  assert.match(source, /setShowCopyGroupDetail\(\(current\) => !current\)/);
  assert.match(source, /setShowPositionSyncDetail\(\(current\) => !current\)/);
  assert.match(source, /copyGroupFollowUpItems/);
  assert.match(source, /Operator Follow-Up/);
  assert.match(source, /runtimeSummary\?\.label === "Restored offline"/);
  assert.match(source, /buildAccountRiskFollowUpQueue/);
  assert.match(source, /riskFollowUpItems/);
  assert.match(source, /Risk Follow-Up/);
  assert.match(source, /manual risk decision before the next copy session/);
  assert.match(source, /"\/api\/position-sync\/plans"/);
  assert.match(source, /"\/api\/position-sync\/reviews"/);
  assert.match(source, /setSelectedPositionSyncGroupId\(group\.groupId\)/);
  assert.match(source, /Show all groups/);
  assert.match(source, /toPositionSyncWorkflowState\(positionSyncWorkflowData\.reviews\)/);
  assert.match(source, /savePositionSyncWorkflowMutation/);
  assert.match(source, /handlePositionSyncSimulation/);
  assert.match(source, /Approved/);
  assert.match(source, /approvedAt/);
  assert.match(source, /Handed Off/);
  assert.match(source, /Completed Manually/);
  assert.match(source, /handedOffAt/);
  assert.match(source, /completedManuallyAt/);
  assert.match(source, /Operator owner:/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /Latest ownership reason:/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Mark reviewed/);
  assert.match(source, /Simulate sync/);
  assert.match(source, /Load the account roster when you want detailed balance/);
  assert.match(source, /Load open positions when you want the live symbol/);
  assert.match(source, /Load the live copy-group alert feed when you want recent routing and follower-health updates\./);
  assert.match(source, /Load position-sync detail when you want per-group sync status and follower review items\./);
});
