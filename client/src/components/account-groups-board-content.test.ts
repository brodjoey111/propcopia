import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupsBoardOverlayProps,
  buildAccountGroupsUngroupedBoardCardProps,
  shouldUseAccountGroupsCompactBoardView,
} from "@/components/account-groups-board-content";

test("account groups board content centralizes kanban and ungrouped presentation wiring", () => {
  const source = readFileSync(
    "client/src/components/account-groups-board-content.tsx",
    "utf8",
  );
  const boardTypesSource = readFileSync(
    "client/src/components/account-groups-board-types.ts",
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
  const badgeSource = readFileSync(
    "client/src/components/account-groups-master-drag-badge.tsx",
    "utf8",
  );
  const ungroupedCardSource = readFileSync(
    "client/src/components/account-groups-ungrouped-card.tsx",
    "utf8",
  );

  assert.match(source, /<AccountGroupsKanbanBoard/);
  assert.match(source, /renderLane=\{\(lane, totalPnl\) =>/);
  assert.match(source, /<AccountGroupsBoardLane/);
  assert.match(source, /groupActions: AccountGroupsBoardGroupActions/);
  assert.match(source, /connectionActions: AccountGroupsBoardConnectionActions/);
  assert.match(source, /runtimeState: AccountGroupsBoardRuntimeState/);
  assert.match(source, /shouldUseAccountGroupsCompactBoardView/);
  assert.match(source, /buildAccountGroupsUngroupedBoardCardProps/);
  assert.match(source, /buildAccountGroupsBoardOverlayProps/);
  assert.match(source, /renderOverlay=/);
  assert.match(source, /<AccountGroupsBoardOverlay/);
  assert.match(source, /getAccountGroupsBoardLaneRuntime/);
  assert.match(source, /<AccountGroupsUngroupedPanel/);
  assert.match(source, /<AccountGroupsUngroupedCard/);
  assert.match(boardTypesSource, /DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME/);
  assert.match(boardTypesSource, /export function getAccountGroupsBoardLaneRuntime/);
  assert.match(laneSource, /<AccountGroupLane/);
  assert.match(laneSource, /runtime: AccountGroupsBoardLaneRuntime/);
  assert.match(laneSource, /buildAccountGroupsBoardLaneRuntimeProps/);
  assert.match(laneSource, /onEmergencyStopGroup=/);
  assert.match(overlaySource, /<AccountGroupsMasterDragBadge \/>/);
  assert.match(badgeSource, /Set as Master/);
  assert.match(overlaySource, /<AccountGroupsDraggableCard/);
  assert.match(ungroupedCardSource, /<AccountGroupsDraggableCard/);
  assert.match(ungroupedCardSource, /compactView=\{compactView\}/);

  assert.equal(shouldUseAccountGroupsCompactBoardView("compact"), true);
  assert.equal(shouldUseAccountGroupsCompactBoardView("detailed"), false);

  const connectionActions = {
    onConnect: () => undefined,
    onDisconnect: () => undefined,
    accountActionDisabled: true,
    getConnectButtonLabel: (accountId: string) => `connect:${accountId}`,
    getDisconnectButtonLabel: (accountId: string) => `disconnect:${accountId}`,
  };
  const cardProps = buildAccountGroupsUngroupedBoardCardProps({
    account: { id: "acct-1" } as any,
    isDemo: false,
    compactView: true,
    connectionActions,
  });

  assert.equal(cardProps.account.id, "acct-1");
  assert.equal(cardProps.isDemo, false);
  assert.equal(cardProps.compactView, true);
  assert.equal(cardProps.onConnect, connectionActions.onConnect);
  assert.equal(cardProps.onDisconnect, connectionActions.onDisconnect);
  assert.equal(cardProps.accountActionDisabled, true);
  assert.equal(cardProps.getConnectButtonLabel?.("acct-1"), "connect:acct-1");
  assert.equal(
    cardProps.getDisconnectButtonLabel?.("acct-1"),
    "disconnect:acct-1",
  );

  const overlayProps = buildAccountGroupsBoardOverlayProps({
    runtimeState: {
      isMasterTokenDrag: true,
      activeAccount: { id: "acct-9" } as any,
    } as any,
    isDemo: false,
  });

  assert.equal(overlayProps.isMasterTokenDrag, true);
  assert.equal(overlayProps.activeAccount?.id, "acct-9");
  assert.equal(overlayProps.isDemo, false);
});
