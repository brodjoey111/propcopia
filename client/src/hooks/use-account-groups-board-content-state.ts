import type {
  AccountGroupsBoardConnectionActions,
  AccountGroupsBoardGroupActions,
  AccountGroupsBoardLane,
  AccountGroupsBoardRiskState,
  AccountGroupsBoardRuntimeState,
  UngroupedAccountGroupsBoardLane,
} from "@/components/account-groups-board-types";
import type { RiskSettings } from "@/components/risk-settings-dialog";
import type { AccountRiskItem } from "@/lib/account-risk";
import type { Account } from "@shared/schema";

interface UseAccountGroupsBoardContentStateOptions {
  lanes: Array<AccountGroupsBoardLane | UngroupedAccountGroupsBoardLane>;
  getGroupAccounts: (groupId: string) => Account[];
  onDragStart: (event: import("@dnd-kit/core").DragStartEvent) => void;
  onDragEnd: (event: import("@dnd-kit/core").DragEndEvent) => void;
  onAddGroup: () => void;
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
  applyGroupRuntimePreference: AccountGroupsBoardGroupActions["applyGroupRuntimePreference"];
  groupRiskSettings: Record<string, Partial<RiskSettings> | undefined>;
  accountRiskById: Record<string, AccountRiskItem | undefined>;
  runtimeState: AccountGroupsBoardRuntimeState;
  ungroupedAccounts: Account[];
}

export function buildAccountGroupsBoardGroupActions(
  options: Pick<
    UseAccountGroupsBoardContentStateOptions,
    | "renameGroup"
    | "deleteGroup"
    | "changeColor"
    | "toggleGroup"
    | "setMaster"
    | "toggleAccountEnabled"
    | "saveGroupRiskSetting"
    | "clearGroupRiskSetting"
    | "applyGroupRuntimePreference"
  >,
): AccountGroupsBoardGroupActions {
  return {
    renameGroup: options.renameGroup,
    deleteGroup: options.deleteGroup,
    changeColor: options.changeColor,
    toggleGroup: options.toggleGroup,
    setMaster: options.setMaster,
    toggleAccountEnabled: options.toggleAccountEnabled,
    saveGroupRiskSetting: options.saveGroupRiskSetting,
    clearGroupRiskSetting: options.clearGroupRiskSetting,
    applyGroupRuntimePreference: options.applyGroupRuntimePreference,
  };
}

export function buildAccountGroupsBoardConnectionActions(
  options: Pick<
    UseAccountGroupsBoardContentStateOptions,
    | "onConnect"
    | "onDisconnect"
    | "accountActionDisabled"
    | "getConnectButtonLabel"
    | "getDisconnectButtonLabel"
  >,
): AccountGroupsBoardConnectionActions {
  return {
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect,
    accountActionDisabled: options.accountActionDisabled,
    getConnectButtonLabel: options.getConnectButtonLabel,
    getDisconnectButtonLabel: options.getDisconnectButtonLabel,
  };
}

export function buildAccountGroupsBoardRiskState(
  options: Pick<
    UseAccountGroupsBoardContentStateOptions,
    "groupRiskSettings" | "accountRiskById"
  >,
): AccountGroupsBoardRiskState {
  return {
    groupRiskSettings: options.groupRiskSettings,
    accountRiskById: options.accountRiskById,
  };
}

export function useAccountGroupsBoardContentState(
  options: UseAccountGroupsBoardContentStateOptions,
) {
  const groupActions = buildAccountGroupsBoardGroupActions(options);
  const connectionActions = buildAccountGroupsBoardConnectionActions(options);
  const riskState = buildAccountGroupsBoardRiskState(options);

  return {
    lanes: options.lanes,
    getGroupAccounts: options.getGroupAccounts,
    onDragStart: options.onDragStart,
    onDragEnd: options.onDragEnd,
    onAddGroup: options.onAddGroup,
    isDemo: options.isDemo,
    groupActions,
    connectionActions,
    riskState,
    runtimeState: options.runtimeState,
    ungroupedAccounts: options.ungroupedAccounts,
  };
}
