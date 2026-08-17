import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AccountGroupLaneCards } from "@/components/account-group-lane-cards";
import { AccountGroupLaneSummary } from "@/components/account-group-lane-summary";
import { AccountGroupMasterToken } from "@/components/account-group-master-token";
import { AccountGroupMasterSlot } from "@/components/account-group-master-slot";
import { type RiskSettings } from "@/components/risk-settings-dialog";
import { useAccountGroupLaneHistory } from "@/hooks/use-account-group-lane-history";
import { useAccountGroupLaneState } from "@/hooks/use-account-group-lane-state";
import type { CopyGroupOperatorSummary } from "@/lib/copy-group-operator-log";
import type {
  CopyGroupActivity,
  CopyGroupRuntimeSummary,
  CopyGroupStatus,
} from "@/lib/copy-groups";
import type { AccountRiskItem } from "@/lib/account-risk";
import type { Account } from "@shared/schema";

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#eab308",
] as const;

export function buildAccountGroupLaneRenameAction(input: {
  groupId: string;
  editName: string;
  onRename: (id: string, name: string) => void;
  setEditing: (value: boolean) => void;
}) {
  return () => {
    const trimmed = input.editName.trim();
    if (trimmed) {
      input.onRename(input.groupId, trimmed);
    }

    input.setEditing(false);
  };
}

export function buildAccountGroupLaneDroppableIds(groupId: string) {
  return {
    laneId: groupId,
    masterClearId: `master-clear:${groupId}`,
  };
}

export function buildAccountGroupLaneMasterToken(input: {
  groupId: string;
  accounts: Account[];
  effectiveMasterId: string | null;
  hasMasterWarning: boolean;
  masterId: string | null;
  setClearRef: (node: HTMLDivElement | null) => void;
  isClearOver: boolean;
}) {
  return (
    <AccountGroupMasterSlot
      setNodeRef={input.setClearRef}
      isOver={input.isClearOver}
      title={input.masterId ? "Drop an account card here to remove master" : undefined}
    >
      <AccountGroupMasterToken
        groupId={input.groupId}
        masterName={
          input.effectiveMasterId
            ? (input.accounts.find((account) => account.id === input.effectiveMasterId)?.name ??
                null)
            : null
        }
        hasWarning={input.hasMasterWarning}
      />
    </AccountGroupMasterSlot>
  );
}

export interface AccountGroupLaneProps {
  group: { id: string; name: string; color: string; isActive?: boolean; masterId?: string | null; disabledAccountIds?: string[] };
  accounts: Account[];
  isUngrouped?: boolean;
  isDemo?: boolean;
  totalPnl: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onToggle: (id: string) => void;
  onSetMaster: (groupId: string, masterId: string | null) => void;
  onToggleAccount: (groupId: string, accountId: string) => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled?: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  onSaveRisk?: (groupId: string, settings: RiskSettings) => void;
  onClearRisk?: (groupId: string) => void;
  riskSettings?: Partial<RiskSettings>;
  accountRiskById?: Record<string, AccountRiskItem | undefined>;
  runtimeStatus?: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  recentActivityPreview?: CopyGroupActivity[];
  runtimeLoading?: boolean;
  runtimeUnavailable?: boolean;
  lifecycleActionPending?: boolean;
  onStartGroup?: (groupId: string) => void;
  onPauseGroup?: (groupId: string) => void;
  onResumeGroup?: (groupId: string) => void;
  onEmergencyStopGroup?: (groupId: string) => void;
  onResetGroup?: (groupId: string) => void;
  operatorSummary?: CopyGroupOperatorSummary | null;
  compactView?: boolean;
}

export function AccountGroupLane({
  group,
  accounts,
  isUngrouped,
  isDemo,
  totalPnl,
  onRename,
  onDelete,
  onColorChange,
  onToggle,
  onSetMaster,
  onToggleAccount,
  onConnect,
  onDisconnect,
  accountActionDisabled = false,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  onSaveRisk,
  onClearRisk,
  riskSettings,
  accountRiskById = {},
  runtimeStatus,
  runtimeSummary,
  recentActivityPreview = [],
  runtimeLoading = false,
  runtimeUnavailable = false,
  lifecycleActionPending = false,
  onStartGroup,
  onPauseGroup,
  onResumeGroup,
  onEmergencyStopGroup,
  onResetGroup,
  operatorSummary,
  compactView = false,
}: AccountGroupLaneProps) {
  const { laneId, masterClearId } = buildAccountGroupLaneDroppableIds(group.id);
  const { setNodeRef, isOver } = useDroppable({ id: laneId });
  const { setNodeRef: setClearRef, isOver: isClearOver } = useDroppable({
    id: masterClearId,
  });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [showPalette, setShowPalette] = useState(false);
  const {
    historyOpen,
    setHistoryOpen,
    historyActivity,
    historyObservability,
    historyLoading,
    historyError,
  } = useAccountGroupLaneHistory({
    groupId: group.id,
    isDemo,
    isUngrouped,
    recentActivityPreview,
  });

  const {
    accentColor,
    resolvedRuntimeStatus,
    isActive,
    masterId,
    disabledIds,
    effectiveMasterId,
    hasMasterWarning,
    groupBoardState,
    groupRiskToneClass,
    recentWarningCount,
    recentErrorCount,
    recentLifecycleCount,
    recentHealthCount,
    latestPreviewMessage,
    latestOperatorAction,
    holdReason,
    routingGate,
  } = useAccountGroupLaneState({
    group,
    accounts,
    isUngrouped,
    accountRiskById,
    runtimeStatus,
    runtimeSummary,
    recentActivityPreview,
  });
  const commitRename = buildAccountGroupLaneRenameAction({
    groupId: group.id,
    editName,
    onRename,
    setEditing,
  });
  const masterToken = buildAccountGroupLaneMasterToken({
    groupId: group.id,
    accounts,
    effectiveMasterId,
    hasMasterWarning,
    masterId,
    setClearRef,
    isClearOver,
  });

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border transition-opacity duration-200 ${!isActive ? "opacity-60" : ""}`}
      style={{ borderColor: `${accentColor}30` }}
    >
      <AccountGroupLaneSummary
        group={group}
        accounts={accounts}
        isUngrouped={isUngrouped}
        isDemo={isDemo}
        totalPnl={totalPnl}
        accentColor={accentColor}
        isActive={isActive}
        editing={editing}
        editName={editName}
        setEditName={setEditName}
        setEditing={setEditing}
        showPalette={showPalette}
        setShowPalette={setShowPalette}
        commitRename={commitRename}
        onDelete={onDelete}
        onColorChange={onColorChange}
        masterToken={masterToken}
        resolvedRuntimeStatus={resolvedRuntimeStatus}
        lifecycleActionPending={lifecycleActionPending}
        onStartGroup={onStartGroup}
        onPauseGroup={onPauseGroup}
        onResumeGroup={onResumeGroup}
        onEmergencyStopGroup={onEmergencyStopGroup}
        onResetGroup={onResetGroup}
        hasMasterWarning={hasMasterWarning}
        riskSettings={riskSettings}
        onSaveRisk={onSaveRisk}
        onClearRisk={onClearRisk}
        groupRiskToneClass={groupRiskToneClass}
        groupBoardStateLabel={groupBoardState.label}
        historyOpen={historyOpen}
        setHistoryOpen={setHistoryOpen}
        historyActivity={historyActivity}
        historyObservability={historyObservability}
        historyLoading={historyLoading}
        historyError={historyError}
        palette={PALETTE}
        runtimeLoading={runtimeLoading}
        runtimeUnavailable={runtimeUnavailable}
        runtimeSummary={runtimeSummary}
        groupBoardState={groupBoardState}
        routingGate={routingGate}
        recentErrorCount={recentErrorCount}
        recentWarningCount={recentWarningCount}
        recentLifecycleCount={recentLifecycleCount}
        recentHealthCount={recentHealthCount}
        latestPreviewMessage={latestPreviewMessage}
        latestOperatorAction={latestOperatorAction}
        holdReason={holdReason}
        operatorSummary={operatorSummary}
      />
      <AccountGroupLaneCards
        accounts={accounts}
        accentColor={accentColor}
        isOver={isOver}
        isUngrouped={isUngrouped}
        setNodeRef={setNodeRef}
        effectiveMasterId={effectiveMasterId}
        isDemo={isDemo}
        compactView={compactView}
        disabledIds={disabledIds}
        groupId={group.id}
        onToggleAccount={onToggleAccount}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        accountActionDisabled={accountActionDisabled}
        getConnectButtonLabel={getConnectButtonLabel}
        getDisconnectButtonLabel={getDisconnectButtonLabel}
        accountRiskById={accountRiskById}
      />
    </div>
  );
}
