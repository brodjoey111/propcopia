import type { ReactNode } from "react";
import { AccountGroupLaneHeader } from "@/components/account-group-lane-header";
import { AccountGroupRuntimeStrip } from "@/components/account-group-runtime-strip";
import type { RiskSettings } from "@/components/risk-settings-dialog";
import type { CopyGroupOperatorSummary } from "@/lib/copy-group-operator-log";
import type {
  CopyGroupActivity,
  CopyGroupObservability,
  CopyGroupRuntimeSummary,
  CopyGroupStatus,
} from "@/lib/copy-groups";
import type { Account } from "@shared/schema";

interface AccountGroupLaneSummaryProps {
  group: { id: string; name: string; color: string; masterId?: string | null };
  accounts: Account[];
  isUngrouped?: boolean;
  isDemo?: boolean;
  totalPnl: number;
  accentColor: string;
  isActive: boolean;
  editing: boolean;
  editName: string;
  setEditName: (value: string) => void;
  setEditing: (value: boolean) => void;
  showPalette: boolean;
  setShowPalette: (value: boolean | ((current: boolean) => boolean)) => void;
  commitRename: () => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  masterToken: ReactNode;
  resolvedRuntimeStatus: CopyGroupStatus;
  lifecycleActionPending: boolean;
  onStartGroup?: (groupId: string) => void;
  onPauseGroup?: (groupId: string) => void;
  onResumeGroup?: (groupId: string) => void;
  onEmergencyStopGroup?: (groupId: string) => void;
  onResetGroup?: (groupId: string) => void;
  hasMasterWarning: boolean;
  riskSettings?: Partial<RiskSettings>;
  onSaveRisk?: (groupId: string, settings: RiskSettings) => void;
  onClearRisk?: (groupId: string) => void;
  groupRiskToneClass: string;
  groupBoardStateLabel: string;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  historyActivity: CopyGroupActivity[];
  historyObservability: CopyGroupObservability | null;
  historyLoading: boolean;
  historyError: string | null;
  palette: readonly string[];
  runtimeLoading: boolean;
  runtimeUnavailable: boolean;
  runtimeSummary?: CopyGroupRuntimeSummary;
  groupBoardState: {
    tone: "ok" | "warn" | "danger" | "muted";
    label: string;
    detail: string;
  };
  routingGate: {
    tone: "ok" | "warn" | "danger" | "muted";
    label: string;
    detail: string;
  };
  recentErrorCount: number;
  recentWarningCount: number;
  recentLifecycleCount: number;
  recentHealthCount: number;
  latestPreviewMessage?: string;
  latestOperatorAction?: string | null;
  holdReason?: string | null;
  operatorSummary?: CopyGroupOperatorSummary | null;
}

export function buildAccountGroupLaneHeaderProps(
  props: AccountGroupLaneSummaryProps,
) {
  return {
    group: props.group,
    accounts: props.accounts,
    isUngrouped: props.isUngrouped,
    isDemo: props.isDemo,
    totalPnl: props.totalPnl,
    accentColor: props.accentColor,
    isActive: props.isActive,
    editing: props.editing,
    editName: props.editName,
    setEditName: props.setEditName,
    setEditing: props.setEditing,
    showPalette: props.showPalette,
    setShowPalette: props.setShowPalette,
    commitRename: props.commitRename,
    onDelete: props.onDelete,
    onColorChange: props.onColorChange,
    masterToken: props.masterToken,
    resolvedRuntimeStatus: props.resolvedRuntimeStatus,
    lifecycleActionPending: props.lifecycleActionPending,
    onStartGroup: props.onStartGroup,
    onPauseGroup: props.onPauseGroup,
    onResumeGroup: props.onResumeGroup,
    onEmergencyStopGroup: props.onEmergencyStopGroup,
    onResetGroup: props.onResetGroup,
    hasMasterWarning: props.hasMasterWarning,
    riskSettings: props.riskSettings,
    onSaveRisk: props.onSaveRisk,
    onClearRisk: props.onClearRisk,
    groupRiskToneClass: props.groupRiskToneClass,
    groupBoardStateLabel: props.groupBoardStateLabel,
    historyOpen: props.historyOpen,
    setHistoryOpen: props.setHistoryOpen,
    historyActivity: props.historyActivity,
    historyObservability: props.historyObservability,
    historyLoading: props.historyLoading,
    historyError: props.historyError,
    palette: props.palette,
    runtimeSummary: props.runtimeSummary,
    groupBoardState: props.groupBoardState,
    latestOperatorAction: props.latestOperatorAction,
    holdReason: props.holdReason,
  };
}

export function buildAccountGroupRuntimeStripProps(
  props: AccountGroupLaneSummaryProps,
) {
  return {
    runtimeLoading: props.runtimeLoading,
    runtimeUnavailable: props.runtimeUnavailable,
    runtimeSummary: props.runtimeSummary,
    resolvedRuntimeStatus: props.resolvedRuntimeStatus,
    accountsCount: props.accounts.length,
    isActive: props.isActive,
    groupBoardState: props.groupBoardState,
    routingGate: props.routingGate,
    recentErrorCount: props.recentErrorCount,
    recentWarningCount: props.recentWarningCount,
    recentLifecycleCount: props.recentLifecycleCount,
    recentHealthCount: props.recentHealthCount,
    latestPreviewMessage: props.latestPreviewMessage,
    latestOperatorAction: props.latestOperatorAction,
    holdReason: props.holdReason,
    operatorSummary: props.operatorSummary,
  };
}

export function shouldShowAccountGroupRuntimeStrip(isUngrouped?: boolean) {
  return !isUngrouped;
}

export function AccountGroupLaneSummary({
  group,
  accounts,
  isUngrouped,
  isDemo,
  totalPnl,
  accentColor,
  isActive,
  editing,
  editName,
  setEditName,
  setEditing,
  showPalette,
  setShowPalette,
  commitRename,
  onDelete,
  onColorChange,
  masterToken,
  resolvedRuntimeStatus,
  lifecycleActionPending,
  onStartGroup,
  onPauseGroup,
  onResumeGroup,
  onEmergencyStopGroup,
  onResetGroup,
  hasMasterWarning,
  riskSettings,
  onSaveRisk,
  onClearRisk,
  groupRiskToneClass,
  groupBoardStateLabel,
  historyOpen,
  setHistoryOpen,
  historyActivity,
  historyObservability,
  historyLoading,
  historyError,
  palette,
  runtimeLoading,
  runtimeUnavailable,
  runtimeSummary,
  groupBoardState,
  routingGate,
  recentErrorCount,
  recentWarningCount,
  recentLifecycleCount,
  recentHealthCount,
  latestPreviewMessage,
  latestOperatorAction,
  holdReason,
  operatorSummary,
}: AccountGroupLaneSummaryProps) {
  const headerProps = buildAccountGroupLaneHeaderProps({
    group,
    accounts,
    isUngrouped,
    isDemo,
    totalPnl,
    accentColor,
    isActive,
    editing,
    editName,
    setEditName,
    setEditing,
    showPalette,
    setShowPalette,
    commitRename,
    onDelete,
    onColorChange,
    masterToken,
    resolvedRuntimeStatus,
    lifecycleActionPending,
    onStartGroup,
    onPauseGroup,
    onResumeGroup,
    onEmergencyStopGroup,
    onResetGroup,
    hasMasterWarning,
    riskSettings,
    onSaveRisk,
    onClearRisk,
    groupRiskToneClass,
    groupBoardStateLabel,
    historyOpen,
    setHistoryOpen,
    historyActivity,
    historyObservability,
    historyLoading,
    historyError,
    palette,
    runtimeLoading,
    runtimeUnavailable,
    runtimeSummary,
    groupBoardState,
    routingGate,
    recentErrorCount,
    recentWarningCount,
    recentLifecycleCount,
    recentHealthCount,
    latestPreviewMessage,
    latestOperatorAction,
    holdReason,
    operatorSummary,
  });
  const runtimeStripProps = buildAccountGroupRuntimeStripProps({
    group,
    accounts,
    isUngrouped,
    isDemo,
    totalPnl,
    accentColor,
    isActive,
    editing,
    editName,
    setEditName,
    setEditing,
    showPalette,
    setShowPalette,
    commitRename,
    onDelete,
    onColorChange,
    masterToken,
    resolvedRuntimeStatus,
    lifecycleActionPending,
    onStartGroup,
    onPauseGroup,
    onResumeGroup,
    onEmergencyStopGroup,
    onResetGroup,
    hasMasterWarning,
    riskSettings,
    onSaveRisk,
    onClearRisk,
    groupRiskToneClass,
    groupBoardStateLabel,
    historyOpen,
    setHistoryOpen,
    historyActivity,
    historyObservability,
    historyLoading,
    historyError,
    palette,
    runtimeLoading,
    runtimeUnavailable,
    runtimeSummary,
    groupBoardState,
    routingGate,
    recentErrorCount,
    recentWarningCount,
    recentLifecycleCount,
    recentHealthCount,
    latestPreviewMessage,
    latestOperatorAction,
    holdReason,
    operatorSummary,
  });

  return (
    <>
      <AccountGroupLaneHeader {...headerProps} />

      {shouldShowAccountGroupRuntimeStrip(isUngrouped) && (
        <AccountGroupRuntimeStrip {...runtimeStripProps} />
      )}
    </>
  );
}
