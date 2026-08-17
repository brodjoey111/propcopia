import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { AccountGroupsBoardLane } from "@/components/account-groups-board-lane";
import { AccountGroupsBoardOverlay } from "@/components/account-groups-board-overlay";
import { getAccountGroupsBoardLaneRuntime } from "@/components/account-groups-board-types";
import type {
  AccountGroupsBoardConnectionActions,
  AccountGroupsBoardLane as AccountGroupsBoardLaneType,
  AccountGroupsBoardGroupActions,
  AccountGroupsBoardRiskState,
  AccountGroupsBoardRuntimeState,
  UngroupedAccountGroupsBoardLane,
} from "@/components/account-groups-board-types";
import { AccountGroupsKanbanBoard } from "@/components/account-groups-kanban-board";
import { AccountGroupsUngroupedCard } from "@/components/account-groups-ungrouped-card";
import { AccountGroupsUngroupedPanel } from "@/components/account-groups-ungrouped-panel";
import type { Account } from "@shared/schema";

interface AccountGroupsBoardContentProps {
  subView: "kanban" | "ungrouped";
  sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
  lanes: Array<AccountGroupsBoardLaneType | UngroupedAccountGroupsBoardLane>;
  getGroupAccounts: (groupId: string) => Account[];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAddGroup: () => void;
  isDemo: boolean;
  groupActions: AccountGroupsBoardGroupActions;
  connectionActions: AccountGroupsBoardConnectionActions;
  riskState: AccountGroupsBoardRiskState;
  runtimeState: AccountGroupsBoardRuntimeState;
  ungroupedAccounts: Account[];
}

export function shouldUseAccountGroupsCompactBoardView(
  boardView: AccountGroupsBoardRuntimeState["boardView"],
) {
  return boardView === "compact";
}

export function buildAccountGroupsUngroupedBoardCardProps(input: {
  account: Account;
  isDemo: boolean;
  compactView: boolean;
  connectionActions: AccountGroupsBoardConnectionActions;
}) {
  return {
    account: input.account,
    isDemo: input.isDemo,
    compactView: input.compactView,
    onConnect: input.connectionActions.onConnect,
    onDisconnect: input.connectionActions.onDisconnect,
    accountActionDisabled: input.connectionActions.accountActionDisabled,
    getConnectButtonLabel: input.connectionActions.getConnectButtonLabel,
    getDisconnectButtonLabel: input.connectionActions.getDisconnectButtonLabel,
  };
}

export function buildAccountGroupsBoardOverlayProps(input: {
  runtimeState: AccountGroupsBoardRuntimeState;
  isDemo: boolean;
}) {
  return {
    isMasterTokenDrag: input.runtimeState.isMasterTokenDrag,
    activeAccount: input.runtimeState.activeAccount,
    isDemo: input.isDemo,
  };
}

export function AccountGroupsBoardContent({
  subView,
  sensors,
  lanes,
  getGroupAccounts,
  onDragStart,
  onDragEnd,
  onAddGroup,
  isDemo,
  groupActions,
  connectionActions,
  riskState,
  runtimeState,
  ungroupedAccounts,
}: AccountGroupsBoardContentProps) {
  const compactView = shouldUseAccountGroupsCompactBoardView(
    runtimeState.boardView,
  );
  const overlayProps = buildAccountGroupsBoardOverlayProps({
    runtimeState,
    isDemo,
  });

  if (subView === "kanban") {
    return (
      <AccountGroupsKanbanBoard
        sensors={sensors}
        lanes={lanes}
        getGroupAccounts={getGroupAccounts}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onAddGroup={onAddGroup}
        renderLane={(lane, totalPnl) => (
          <AccountGroupsBoardLane
            key={lane.id}
            lane={lane}
            accounts={getGroupAccounts(lane.id)}
            isDemo={isDemo}
            totalPnl={totalPnl}
            renameGroup={groupActions.renameGroup}
            deleteGroup={groupActions.deleteGroup}
            changeColor={groupActions.changeColor}
            toggleGroup={groupActions.toggleGroup}
            setMaster={groupActions.setMaster}
            toggleAccountEnabled={groupActions.toggleAccountEnabled}
            onConnect={connectionActions.onConnect}
            onDisconnect={connectionActions.onDisconnect}
            accountActionDisabled={connectionActions.accountActionDisabled}
            getConnectButtonLabel={connectionActions.getConnectButtonLabel}
            getDisconnectButtonLabel={connectionActions.getDisconnectButtonLabel}
            saveGroupRiskSetting={groupActions.saveGroupRiskSetting}
            clearGroupRiskSetting={groupActions.clearGroupRiskSetting}
            riskSettings={riskState.groupRiskSettings[lane.id]}
            accountRiskById={riskState.accountRiskById}
            runtime={getAccountGroupsBoardLaneRuntime(lane.id, runtimeState.laneRuntimeByGroupId)}
            runtimeLoading={!lane.isUngrouped && runtimeState.isCopyGroupSnapshotLoading}
            runtimeUnavailable={!lane.isUngrouped && runtimeState.isCopyGroupSnapshotError}
            lifecycleActionPending={runtimeState.pendingLifecycleGroupId === lane.id}
            compactView={compactView}
            applyGroupRuntimePreference={groupActions.applyGroupRuntimePreference}
          />
        )}
        renderOverlay={
          <AccountGroupsBoardOverlay {...overlayProps} />
        }
      />
    );
  }

  return (
    <AccountGroupsUngroupedPanel
      accounts={ungroupedAccounts}
      sensors={sensors}
      renderAccountCard={(account) => {
        const cardProps = buildAccountGroupsUngroupedBoardCardProps({
          account,
          isDemo,
          compactView,
          connectionActions,
        });

        return <AccountGroupsUngroupedCard {...cardProps} />;
      }}
    />
  );
}
