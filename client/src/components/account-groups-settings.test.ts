import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("account groups persist the ungrouped lane name through user settings", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const controllerSource = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );
  const preferencesSource = readFileSync(
    "client/src/hooks/use-account-groups-board-preferences.ts",
    "utf8",
  );
  const lifecycleSource = readFileSync(
    "client/src/hooks/use-account-groups-lifecycle-actions.ts",
    "utf8",
  );

  assert.match(preferencesSource, /resolveAccountGroupsPersistedUngroupedName/);
  assert.match(source, /useAccountGroupsController\(\{/);
  assert.match(controllerSource, /useAccountGroupsLifecycleActions\(\{/);
  assert.match(lifecycleSource, /apiRequest\("PATCH", "\/api\/user\/settings", \{\s*copyGroupsUngroupedName: trimmedName,/);
  assert.match(lifecycleSource, /queryClient\.setQueryData\(\["\/api\/auth\/me"\], payload\)/);
});

test("account groups delegate snapshot hydration and board registration syncing through the extracted hook", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const controllerSource = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsController\(\{/);
  assert.match(controllerSource, /useAccountGroupsSync\(\{/);
  assert.match(controllerSource, /registeredGroupsData/);
  assert.match(controllerSource, /persistGroups: saveGroups/);
  assert.match(controllerSource, /persistAssignments: saveAssignments/);
});

test("account groups delegate board mutations and drag orchestration through the extracted hook", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const boardContentSource = readFileSync(
    "client/src/components/account-groups-board-content.tsx",
    "utf8",
  );
  const boardLaneSource = readFileSync(
    "client/src/components/account-groups-board-lane.tsx",
    "utf8",
  );
  const controllerSource = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );
  const boardContentStateSource = readFileSync(
    "client/src/hooks/use-account-groups-board-content-state.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsController\(\{/);
  assert.match(controllerSource, /useAccountGroupsBoardActions\(\{/);
  assert.match(controllerSource, /useAccountGroupsBoardContentState\(\{/);
  assert.match(controllerSource, /handleDragStart/);
  assert.match(controllerSource, /handleDragEnd/);
  assert.match(controllerSource, /const boardContentState = useAccountGroupsBoardContentState\(\{/);
  assert.match(controllerSource, /renameGroup,/);
  assert.match(controllerSource, /deleteGroup,/);
  assert.match(controllerSource, /changeColor,/);
  assert.match(controllerSource, /toggleGroup,/);
  assert.match(controllerSource, /setMaster,/);
  assert.match(controllerSource, /toggleAccountEnabled,/);
  assert.match(boardContentStateSource, /buildAccountGroupsBoardGroupActions/);
  assert.match(boardContentStateSource, /buildAccountGroupsBoardConnectionActions/);
  assert.match(boardContentStateSource, /buildAccountGroupsBoardRiskState/);
  assert.match(boardContentSource, /<AccountGroupsBoardLane/);
  assert.match(boardLaneSource, /onRename=\{renameGroup\}/);
  assert.match(boardLaneSource, /onDelete=\{deleteGroup\}/);
  assert.match(boardLaneSource, /onColorChange=\{changeColor\}/);
  assert.match(boardLaneSource, /onToggle=\{toggleGroup\}/);
  assert.match(boardLaneSource, /onSetMaster=\{setMaster\}/);
  assert.match(boardLaneSource, /onToggleAccount=\{toggleAccountEnabled\}/);
});

test("account groups delegate render prep and lane assembly through the extracted hook", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const controllerSource = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );
  const boardContentStateSource = readFileSync(
    "client/src/hooks/use-account-groups-board-content-state.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsController\(\{/);
  assert.match(controllerSource, /useAccountGroupsRenderData\(\{/);
  assert.match(controllerSource, /useAccountGroupsBoardContentState\(\{/);
  assert.match(boardContentStateSource, /runtimeState: options\.runtimeState/);
  assert.match(controllerSource, /isMasterTokenDrag/);
  assert.match(controllerSource, /activeAccount/);
  assert.match(controllerSource, /ungroupedAccounts/);
  assert.match(controllerSource, /lanes/);
});

test("account groups delegate toolbar and ungrouped roster sections through extracted components", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const boardContentSource = readFileSync(
    "client/src/components/account-groups-board-content.tsx",
    "utf8",
  );
  const laneSource = readFileSync(
    "client/src/components/account-groups-board-lane.tsx",
    "utf8",
  );
  const overlaySource = readFileSync(
    "client/src/components/account-groups-board-overlay.tsx",
    "utf8",
  );
  const ungroupedCardSource = readFileSync(
    "client/src/components/account-groups-ungrouped-card.tsx",
    "utf8",
  );

  assert.match(source, /<AccountGroupsDemoBanner/);
  assert.match(source, /<AccountGroupsBoardToolbar/);
  assert.match(source, /onSubViewChange=\{setSubView\}/);
  assert.match(source, /onBoardViewChange=\{setBoardView\}/);
  assert.match(source, /<AccountGroupsBoardContent/);
  assert.match(source, /\{\.\.\.boardContentState\}/);
  assert.match(boardContentSource, /<AccountGroupsKanbanBoard/);
  assert.match(boardContentSource, /<AccountGroupsBoardLane/);
  assert.match(laneSource, /<AccountGroupLane/);
  assert.match(boardContentSource, /<AccountGroupsBoardOverlay/);
  assert.match(overlaySource, /<AccountGroupsMasterDragBadge \/>/);
  assert.match(overlaySource, /<AccountGroupsDraggableCard/);
  assert.match(boardContentSource, /<AccountGroupsUngroupedPanel/);
  assert.match(boardContentSource, /<AccountGroupsUngroupedCard/);
  assert.match(ungroupedCardSource, /<AccountGroupsDraggableCard/);
});

test("account groups load full history only when the history dialog opens", () => {
  const laneHistorySource = readFileSync(
    "client/src/hooks/use-account-group-lane-history.ts",
    "utf8",
  );
  const laneSource = readFileSync(
    "client/src/components/account-group-lane.tsx",
    "utf8",
  );
  const laneSummarySource = readFileSync(
    "client/src/components/account-group-lane-summary.tsx",
    "utf8",
  );
  const renderDataSource = readFileSync(
    "client/src/hooks/use-account-groups-render-data.ts",
    "utf8",
  );

  assert.match(laneSource, /useAccountGroupLaneHistory\(\{/);
  assert.match(laneHistorySource, /const \[historyOpen, setHistoryOpen\] = useState\(false\)/);
  assert.match(laneHistorySource, /fetch\(`\/api\/copy-groups\/\$\{groupId\}\/activity`/);
  assert.match(renderDataSource, /registeredGroup\.activityPreview/);
  assert.match(laneSummarySource, /<AccountGroupLaneHeader/);
});

test("account groups highlight copy groups restored safely after reload", () => {
  const laneSummarySource = readFileSync(
    "client/src/components/account-group-lane-summary.tsx",
    "utf8",
  );

  assert.match(laneSummarySource, /<AccountGroupRuntimeStrip/);
});

test("account groups keep a compact board mode for lighter copy-group scanning", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const controllerSource = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );
  const boardContentSource = readFileSync(
    "client/src/components/account-groups-board-content.tsx",
    "utf8",
  );
  const toolbarSource = readFileSync(
    "client/src/components/account-groups-board-toolbar.tsx",
    "utf8",
  );
  const draggableCardSource = readFileSync(
    "client/src/components/account-groups-draggable-card.tsx",
    "utf8",
  );

  assert.match(source, /useAccountGroupsController\(\{/);
  assert.match(controllerSource, /useAccountGroupsBoardPreferences\(\{/);
  assert.match(source, /<AccountGroupsBoardToolbar/);
  assert.match(toolbarSource, /Compact view/);
  assert.match(toolbarSource, /Detailed view/);
  assert.match(boardContentSource, /shouldUseAccountGroupsCompactBoardView/);
  assert.match(draggableCardSource, /Compact view keeps account detail lighter\./);
});

test("account groups show a compact recovery snapshot from preview activity", () => {
  const laneStateSource = readFileSync(
    "client/src/hooks/use-account-group-lane-state.ts",
    "utf8",
  );
  const laneSource = readFileSync(
    "client/src/components/account-group-lane.tsx",
    "utf8",
  );
  const laneSummarySource = readFileSync(
    "client/src/components/account-group-lane-summary.tsx",
    "utf8",
  );

  assert.match(laneSource, /useAccountGroupLaneState\(\{/);
  assert.match(laneStateSource, /recentWarningCount/);
  assert.match(laneStateSource, /recentErrorCount/);
  assert.match(laneStateSource, /recentLifecycleCount/);
  assert.match(laneStateSource, /recentHealthCount/);
  assert.match(laneStateSource, /latestPreviewMessage/);
  assert.match(laneSummarySource, /<AccountGroupRuntimeStrip/);
});

test("account groups surface last operator action and hold reason summaries", () => {
  const laneStateSource = readFileSync(
    "client/src/hooks/use-account-group-lane-state.ts",
    "utf8",
  );
  const laneSource = readFileSync(
    "client/src/components/account-group-lane.tsx",
    "utf8",
  );
  const laneSummarySource = readFileSync(
    "client/src/components/account-group-lane-summary.tsx",
    "utf8",
  );

  assert.match(laneSource, /useAccountGroupLaneState\(\{/);
  assert.match(laneStateSource, /describeLatestOperatorAction/);
  assert.match(laneStateSource, /describeHoldReason/);
  assert.match(laneStateSource, /latestOperatorAction/);
  assert.match(laneStateSource, /holdReason/);
  assert.match(laneSummarySource, /<AccountGroupRuntimeStrip/);
});

test("account groups delegate lane cards through the extracted drop zone", () => {
  const laneSource = readFileSync(
    "client/src/components/account-group-lane.tsx",
    "utf8",
  );
  const laneCardsSource = readFileSync(
    "client/src/components/account-group-lane-cards.tsx",
    "utf8",
  );

  assert.match(laneSource, /<AccountGroupLaneCards/);
  assert.match(laneCardsSource, /<AccountGroupDropZone/);
  assert.match(laneCardsSource, /renderAccountCard=\{\(account\)/);
  assert.match(laneCardsSource, /buildAccountGroupCardConnectionBindings/);
  assert.match(laneCardsSource, /const riskBadge = toAccountRiskBadgeView\(accountRiskById\[account\.id\]\)/);
});

test("account groups delegate card header and connection states through extracted card components", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const boardContentSource = readFileSync(
    "client/src/components/account-groups-board-content.tsx",
    "utf8",
  );
  const ungroupedCardSource = readFileSync(
    "client/src/components/account-groups-ungrouped-card.tsx",
    "utf8",
  );
  const overlaySource = readFileSync(
    "client/src/components/account-groups-board-overlay.tsx",
    "utf8",
  );
  const draggableCardSource = readFileSync(
    "client/src/components/account-groups-draggable-card.tsx",
    "utf8",
  );

  assert.match(source, /<AccountGroupsBoardContent/);
  assert.match(boardContentSource, /<AccountGroupsUngroupedCard/);
  assert.match(ungroupedCardSource, /<AccountGroupsDraggableCard/);
  assert.match(overlaySource, /<AccountGroupsDraggableCard/);
  assert.match(draggableCardSource, /<AccountGroupCardHeader/);
  assert.match(draggableCardSource, /masterAdornment=/);
  assert.match(draggableCardSource, /<AccountGroupCardConnectionAction/);
});

test("account groups delegate the draggable master token through an extracted component", () => {
  const laneSource = readFileSync(
    "client/src/components/account-group-lane.tsx",
    "utf8",
  );
  const masterTokenSource = readFileSync(
    "client/src/components/account-group-master-token.tsx",
    "utf8",
  );
  const masterSlotSource = readFileSync(
    "client/src/components/account-group-master-slot.tsx",
    "utf8",
  );

  assert.match(laneSource, /<AccountGroupMasterToken/);
  assert.match(laneSource, /<AccountGroupMasterSlot/);
  assert.match(masterTokenSource, /useDraggable/);
  assert.match(masterTokenSource, /Drag onto an account to make it the master/);
  assert.match(masterSlotSource, /ring-2 ring-red-400\/70 bg-red-500\/10/);
});

test("account groups build and pass operator summaries into the runtime strip", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");
  const controllerSource = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );
  const boardContentSource = readFileSync(
    "client/src/components/account-groups-board-content.tsx",
    "utf8",
  );
  const boardTypesSource = readFileSync(
    "client/src/components/account-groups-board-types.ts",
    "utf8",
  );
  const renderDataSource = readFileSync(
    "client/src/hooks/use-account-groups-render-data.ts",
    "utf8",
  );
  const runtimeStateSource = readFileSync(
    "client/src/hooks/use-account-groups-runtime-state.ts",
    "utf8",
  );

  assert.match(renderDataSource, /const operatorSummaryByGroupId = new Map/);
  assert.match(renderDataSource, /buildCopyGroupOperatorSummary\(entries\)/);
  assert.match(renderDataSource, /const laneRuntimeByGroupId = new Map<string, AccountGroupsBoardLaneRuntime>/);
  assert.match(source, /useAccountGroupsController\(\{/);
  assert.match(controllerSource, /useAccountGroupsBoardContentState\(\{/);
  assert.match(controllerSource, /laneRuntimeByGroupId,/);
  assert.match(boardContentSource, /getAccountGroupsBoardLaneRuntime/);
  assert.match(boardTypesSource, /DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME/);
  assert.match(controllerSource, /useAccountGroupsRuntimeState\(\{/);
  assert.match(runtimeStateSource, /recordOperatorAction = \(/);
});
