import { AccountGroupLane } from "@/components/account-group-lane";
import type { AccountGroupsBoardLane, AccountGroupsBoardLaneRuntime } from "@/components/account-groups-board-types";
import type { RiskSettings } from "@/components/risk-settings-dialog";
import type { AccountRiskItem } from "@/lib/account-risk";
import type { Account } from "@shared/schema";

export function buildAccountGroupsBoardLaneLifecycleActions(
  applyGroupRuntimePreference: (
    groupId: string,
    preference: "ready" | "paused" | "emergency_stopped",
  ) => void,
) {
  return {
    onStartGroup: (groupId: string) =>
      void applyGroupRuntimePreference(groupId, "ready"),
    onPauseGroup: (groupId: string) =>
      void applyGroupRuntimePreference(groupId, "paused"),
    onResumeGroup: (groupId: string) =>
      void applyGroupRuntimePreference(groupId, "ready"),
    onEmergencyStopGroup: (groupId: string) =>
      void applyGroupRuntimePreference(groupId, "emergency_stopped"),
    onResetGroup: (groupId: string) =>
      void applyGroupRuntimePreference(groupId, "ready"),
  };
}

export function buildAccountGroupsBoardLaneRuntimeProps(input: {
  runtime: AccountGroupsBoardLaneRuntime;
  runtimeLoading: boolean;
  runtimeUnavailable: boolean;
  lifecycleActionPending: boolean;
  compactView: boolean;
}) {
  return {
    runtimeStatus: input.runtime.runtimeStatus,
    runtimeSummary: input.runtime.runtimeSummary,
    recentActivityPreview: input.runtime.recentActivityPreview,
    runtimeLoading: input.runtimeLoading,
    runtimeUnavailable: input.runtimeUnavailable,
    lifecycleActionPending: input.lifecycleActionPending,
    operatorSummary: input.runtime.operatorSummary,
    compactView: input.compactView,
  };
}

interface AccountGroupsBoardLaneProps {
  lane: AccountGroupsBoardLane;
  totalPnl: number;
  accounts: Account[];
  isDemo: boolean;
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  changeColor: (id: string, color: string) => void;
  toggleGroup: (id: string) => void;
  setMaster: (groupId: string, masterId: string | null) => void;
  toggleAccountEnabled: (groupId: string, accountId: string) => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  saveGroupRiskSetting: (groupId: string, settings: RiskSettings) => void;
  clearGroupRiskSetting: (groupId: string) => void;
  riskSettings?: Partial<RiskSettings>;
  accountRiskById: Record<string, AccountRiskItem | undefined>;
  runtime: AccountGroupsBoardLaneRuntime;
  runtimeLoading: boolean;
  runtimeUnavailable: boolean;
  lifecycleActionPending: boolean;
  compactView: boolean;
  applyGroupRuntimePreference: (
    groupId: string,
    preference: "ready" | "paused" | "emergency_stopped",
  ) => void;
}

export function AccountGroupsBoardLane({
  lane,
  totalPnl,
  accounts,
  isDemo,
  renameGroup,
  deleteGroup,
  changeColor,
  toggleGroup,
  setMaster,
  toggleAccountEnabled,
  onConnect,
  onDisconnect,
  accountActionDisabled,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  saveGroupRiskSetting,
  clearGroupRiskSetting,
  riskSettings,
  accountRiskById,
  runtime,
  runtimeLoading,
  runtimeUnavailable,
  lifecycleActionPending,
  compactView,
  applyGroupRuntimePreference,
}: AccountGroupsBoardLaneProps) {
  const lifecycleActions = buildAccountGroupsBoardLaneLifecycleActions(
    applyGroupRuntimePreference,
  );
  const runtimeProps = buildAccountGroupsBoardLaneRuntimeProps({
    runtime,
    runtimeLoading,
    runtimeUnavailable,
    lifecycleActionPending,
    compactView,
  });

  return (
    <AccountGroupLane
      group={lane}
      accounts={accounts}
      isUngrouped={lane.isUngrouped}
      isDemo={isDemo}
      totalPnl={totalPnl}
      onRename={renameGroup}
      onDelete={deleteGroup}
      onColorChange={changeColor}
      onToggle={toggleGroup}
      onSetMaster={setMaster}
      onToggleAccount={toggleAccountEnabled}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      accountActionDisabled={accountActionDisabled}
      getConnectButtonLabel={getConnectButtonLabel}
      getDisconnectButtonLabel={getDisconnectButtonLabel}
      onSaveRisk={saveGroupRiskSetting}
      onClearRisk={clearGroupRiskSetting}
      riskSettings={riskSettings}
      accountRiskById={accountRiskById}
      runtimeStatus={runtimeProps.runtimeStatus}
      runtimeSummary={runtimeProps.runtimeSummary}
      recentActivityPreview={runtimeProps.recentActivityPreview}
      runtimeLoading={runtimeProps.runtimeLoading}
      runtimeUnavailable={runtimeProps.runtimeUnavailable}
      lifecycleActionPending={runtimeProps.lifecycleActionPending}
      operatorSummary={runtimeProps.operatorSummary}
      compactView={runtimeProps.compactView}
      onStartGroup={lifecycleActions.onStartGroup}
      onPauseGroup={lifecycleActions.onPauseGroup}
      onResumeGroup={lifecycleActions.onResumeGroup}
      onEmergencyStopGroup={lifecycleActions.onEmergencyStopGroup}
      onResetGroup={lifecycleActions.onResetGroup}
    />
  );
}
