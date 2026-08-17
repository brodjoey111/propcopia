import { useState } from "react";
import {
  DEMO_ACCOUNTS,
  DEMO_ASSIGNMENTS,
  DEMO_GROUPS,
  loadAssignments,
  loadGroups,
  PALETTE,
  saveAssignments,
  saveGroups,
  type TradingGroup,
  UNGROUPED_ID,
} from "@/components/account-groups-model";
import { useUser } from "@/contexts/user-context";
import { useAccountGroupsBoardActions } from "@/hooks/use-account-groups-board-actions";
import { useAccountGroupsBoardContentState } from "@/hooks/use-account-groups-board-content-state";
import { useAccountGroupsBoardPreferences } from "@/hooks/use-account-groups-board-preferences";
import { useAccountGroupsLifecycleActions } from "@/hooks/use-account-groups-lifecycle-actions";
import { useAccountGroupsRenderData } from "@/hooks/use-account-groups-render-data";
import { useAccountGroupsRuntimeState } from "@/hooks/use-account-groups-runtime-state";
import { useAccountGroupsSync } from "@/hooks/use-account-groups-sync";
import {
  useAccountGroupsAddGroupTrigger,
  useAccountGroupsViewController,
} from "@/hooks/use-account-groups-view-controller";
import { useToast } from "@/hooks/use-toast";
import type { AccountGroupsBoardRuntimeState } from "@/components/account-groups-board-types";
import type { AccountRiskItem } from "@/lib/account-risk";
import type { Account } from "@shared/schema";

interface UseAccountGroupsControllerOptions {
  accounts: Account[];
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  accountRiskById: Record<string, AccountRiskItem | undefined>;
  addGroupTrigger?: number;
}

export function buildAccountGroupsControllerRuntimeState(
  options: Pick<
    AccountGroupsBoardRuntimeState,
    | "laneRuntimeByGroupId"
    | "isCopyGroupSnapshotLoading"
    | "isCopyGroupSnapshotError"
    | "pendingLifecycleGroupId"
    | "boardView"
    | "isMasterTokenDrag"
    | "activeAccount"
  >,
): AccountGroupsBoardRuntimeState {
  return {
    laneRuntimeByGroupId: options.laneRuntimeByGroupId,
    isCopyGroupSnapshotLoading: options.isCopyGroupSnapshotLoading,
    isCopyGroupSnapshotError: options.isCopyGroupSnapshotError,
    pendingLifecycleGroupId: options.pendingLifecycleGroupId,
    boardView: options.boardView,
    isMasterTokenDrag: options.isMasterTokenDrag,
    activeAccount: options.activeAccount,
  };
}

export function useAccountGroupsController(
  options: UseAccountGroupsControllerOptions,
) {
  const { user } = useUser();
  const { toast } = useToast();
  const isDemo = options.accounts.length === 0;

  const [groups, setGroups] = useState<TradingGroup[]>(loadGroups);
  const [assignments, setAssignments] = useState<Record<string, string>>(loadAssignments);
  const [demoGroups, setDemoGroups] = useState<TradingGroup[]>([...DEMO_GROUPS]);
  const [demoAssignments, setDemoAssignments] = useState<Record<string, string>>(DEMO_ASSIGNMENTS);

  const {
    demoUngroupedName,
    setDemoUngroupedName,
    ungroupedName,
    setUngroupedName,
    bannerDismissed,
    dismissBanner,
    boardView,
    setBoardView,
    subView,
    setSubView,
    groupRiskSettings,
    setGroupRiskSettings,
    saveGroupRiskSetting: persistGroupRiskSetting,
    clearGroupRiskSetting: removeGroupRiskSetting,
  } = useAccountGroupsBoardPreferences({
    isDemo,
    userId: user?.id,
    serverUngroupedName: user?.copyGroupsUngroupedName,
  });
  const {
    operatorLogByGroupId,
    registeredGroupsData,
    isCopyGroupSnapshotLoading,
    isCopyGroupSnapshotError,
    recordOperatorAction,
    saveGroupRiskSetting,
    clearGroupRiskSetting,
  } = useAccountGroupsRuntimeState({
    isDemo,
    userId: user?.id,
    persistGroupRiskSetting,
    removeGroupRiskSetting,
  });

  useAccountGroupsSync({
    isDemo,
    userId: user?.id,
    accounts: options.accounts,
    groups,
    assignments,
    groupRiskSettings,
    registeredGroupsData,
    setGroups,
    setAssignments,
    setGroupRiskSettings,
    persistGroups: saveGroups,
    persistAssignments: saveAssignments,
  });

  const {
    displayAccounts,
    sensors,
    persistGroups,
    persistAssignments,
  } = useAccountGroupsViewController({
    isDemo,
    accounts: options.accounts,
    demoAccounts: DEMO_ACCOUNTS,
    groups,
    demoGroups,
    assignments,
    demoAssignments,
    setGroups,
    setAssignments,
    persistSavedGroups: saveGroups,
    persistSavedAssignments: saveAssignments,
  });

  const {
    pendingLifecycleGroupId,
    persistUngroupedLaneName,
    applyGroupRuntimePreference,
  } = useAccountGroupsLifecycleActions({
    isDemo,
    userId: user?.id,
    groups,
    assignments,
    accounts: options.accounts,
    groupRiskSettings,
    persistGroups,
    setUngroupedName,
    toast,
    recordOperatorAction,
  });
  const {
    activeId,
    getGroupAccounts,
    addGroup,
    renameGroup,
    deleteGroup,
    changeColor,
    toggleGroup,
    setMaster,
    toggleAccountEnabled,
    handleDragStart,
    handleDragEnd,
  } = useAccountGroupsBoardActions({
    isDemo,
    groups,
    demoGroups,
    assignments,
    demoAssignments,
    accounts: displayAccounts,
    demoUngroupedName,
    ungroupedName,
    palette: PALETTE,
    ungroupedId: UNGROUPED_ID,
    persistGroups,
    persistAssignments,
    setDemoGroups,
    setDemoAssignments,
    setDemoUngroupedName,
    setUngroupedName,
    persistUngroupedLaneName,
    recordOperatorAction,
    toast,
  });
  const {
    laneRuntimeByGroupId,
    isMasterTokenDrag,
    activeAccount,
    ungroupedAccounts,
    lanes,
  } = useAccountGroupsRenderData({
    isDemo,
    accounts: options.accounts,
    demoAccounts: DEMO_ACCOUNTS,
    groups,
    demoGroups,
    assignments,
    demoAssignments,
    registeredGroupsData,
    operatorLogByGroupId,
    activeId,
    ungroupedId: UNGROUPED_ID,
    ungroupedName,
    demoUngroupedName,
  });

  useAccountGroupsAddGroupTrigger({
    addGroupTrigger: options.addGroupTrigger,
    addGroup,
  });

  const runtimeState = buildAccountGroupsControllerRuntimeState({
    laneRuntimeByGroupId,
    isCopyGroupSnapshotLoading,
    isCopyGroupSnapshotError,
    pendingLifecycleGroupId,
    boardView,
    isMasterTokenDrag,
    activeAccount,
  });

  const boardContentState = useAccountGroupsBoardContentState({
    lanes,
    getGroupAccounts,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onAddGroup: addGroup,
    isDemo,
    renameGroup,
    deleteGroup,
    changeColor,
    toggleGroup,
    setMaster,
    toggleAccountEnabled,
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect,
    accountActionDisabled: options.accountActionDisabled,
    getConnectButtonLabel: options.getConnectButtonLabel,
    getDisconnectButtonLabel: options.getDisconnectButtonLabel,
    saveGroupRiskSetting,
    clearGroupRiskSetting,
    applyGroupRuntimePreference,
    groupRiskSettings,
    accountRiskById: options.accountRiskById,
    runtimeState,
    ungroupedAccounts,
  });

  return {
    isDemo,
    bannerDismissed,
    dismissBanner,
    boardView,
    setBoardView,
    subView,
    setSubView,
    addGroup,
    sensors,
    boardContentState,
  };
}
