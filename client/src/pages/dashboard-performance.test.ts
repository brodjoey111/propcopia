import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard defers lower detail queries until after the initial paint", () => {
  const source = readFileSync("client/src/pages/dashboard.tsx", "utf8");

  assert.match(source, /useDashboardDetailPreferences/);
  assert.match(
    source,
    /enabled:\s*[\s\S]*?!!authData\?\.user\?\.id\s*&&[\s\S]*?hasConnectedAccounts\s*&&[\s\S]*?loadDetailSections\s*&&[\s\S]*?\(showAccountRoster \|\| showOpenPositions\)/,
  );
  assert.match(source, /setShowAccountRoster\(\(current\) => !current\)/);
  assert.match(source, /setShowOpenPositions\(\(current\) => !current\)/);
  assert.match(source, /setShowCopyGroupDetail\(\(current\) => !current\)/);
  assert.match(source, /setShowPositionSyncDetail\(\(current\) => !current\)/);
  assert.match(source, /copyGroupFollowUpItems/);
  assert.match(source, /buildCopyGroupRestartRecoveryItems/);
  assert.match(source, /copyGroupRestartRecoveryItems/);
  assert.match(source, /Operator Follow-Up/);
  assert.match(source, /Restart Recovery/);
  assert.match(source, /Restart recoveries/);
  assert.match(source, /P95 Dispatch/);
  assert.match(source, /dispatchLatencySampleSize/);
  assert.match(source, /dispatch samples/);
  assert.match(source, /runtimeSummary\?\.label !== "Restored offline"/);
  assert.match(source, /useOperatorFollowUpData/);
  assert.match(source, /useDashboardPositionSyncData/);
  assert.match(source, /useDashboardExecutionFollowUp/);
  assert.match(source, /useDashboardPositionSyncWorkflow/);
  assert.match(source, /DashboardAccountRosterPanel/);
  assert.match(source, /DashboardPositionSyncPanel/);
  assert.match(source, /DashboardSignalMatrixPanel/);
  assert.match(source, /runtimeOverviewData\?\.tradeLogger/);
  assert.match(source, /const tradeLoggerStats = runtimeOverviewData\?\.tradeLogger/);
  assert.match(source, /Trade Logger/);
  assert.match(source, /Queued records/);
  assert.match(source, /Peak queue/);
  assert.match(source, /Failed flushes/);
  assert.match(source, /Last successful batch:/);
  assert.match(source, /riskFollowUpItems/);
  assert.match(source, /matrixRows/);
  assert.match(source, /followerHealthRows/);
  assert.match(source, /useFollowUpReviewActions/);
  assert.match(source, /saveExecutionFollowUpReviewsMutation/);
  assert.match(source, /DashboardExecutionFollowUpGrid/);
  assert.match(source, /handleExecutionRecoveryItemTakeOwnership/);
  assert.match(source, /handleExecutionRecoveryItemSaveNote/);
  assert.match(source, /handleExecutionRecoveryItemReopen/);
  assert.match(source, /selectedPositionSyncGroupId=\{selectedPositionSyncGroupId\}/);
  assert.match(source, /onSelectGroup=\{setSelectedPositionSyncGroupId\}/);
  assert.match(source, /positionSyncRepairBoardSummary/);
  assert.match(source, /positionSyncRepairAttentionItems/);
  assert.match(source, /positionSyncReviewGroups/);
  assert.match(source, /positionSyncSummaryGroups/);
  assert.match(source, /positionSyncPlanGroups/);
  assert.match(source, /handleRepairCandidateTakeOwnership/);
  assert.match(source, /handleRepairCandidateAdvance/);
  assert.match(source, /savePositionSyncWorkflowMutation/);
  assert.match(source, /handlePositionSyncSimulation/);
  assert.match(source, /dashboardAccounts=\{dashboardAccounts\}/);
  assert.match(source, /onToggleRoster=\{\(\) => setShowAccountRoster\(\(current\) => !current\)\}/);
  assert.match(source, /Load open positions when you want the live symbol/);
  assert.match(source, /Load the live copy-group alert feed when you want recent routing and follower-health updates\./);
});
