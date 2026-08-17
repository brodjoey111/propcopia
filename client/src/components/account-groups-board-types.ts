import type { RiskSettings } from "@/components/risk-settings-dialog";
import type { AccountRiskItem } from "@/lib/account-risk";
import type { CopyGroupOperatorSummary } from "@/lib/copy-group-operator-log";
import type {
  CopyGroupActivity,
  CopyGroupRuntimeSummary,
  CopyGroupStatus,
} from "@/lib/copy-groups";
import type { Account } from "@shared/schema";

export interface AccountGroupsBoardLane {
  id: string;
  name: string;
  color: string;
  isUngrouped: boolean;
  isActive?: boolean;
  masterId?: string | null;
  disabledAccountIds?: string[];
}

export interface UngroupedAccountGroupsBoardLane {
  id: string;
  name: string;
  color: string;
  isUngrouped: true;
}

export interface AccountGroupsBoardLaneRuntime {
  runtimeStatus?: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  recentActivityPreview: CopyGroupActivity[];
  operatorSummary: CopyGroupOperatorSummary | null;
}

export const DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME: AccountGroupsBoardLaneRuntime = {
  recentActivityPreview: [],
  operatorSummary: null,
};

export function isDefaultAccountGroupsBoardLaneRuntime(
  runtime: AccountGroupsBoardLaneRuntime,
) {
  return runtime === DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME;
}

export function getAccountGroupsBoardLaneRuntime(
  laneId: string,
  laneRuntimeByGroupId: Map<string, AccountGroupsBoardLaneRuntime>,
): AccountGroupsBoardLaneRuntime {
  return laneRuntimeByGroupId.get(laneId) ?? DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME;
}

export interface AccountGroupsBoardConnectionActions {
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
}

export interface AccountGroupsBoardGroupActions {
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  changeColor: (id: string, color: string) => void;
  toggleGroup: (id: string) => void;
  setMaster: (groupId: string, masterId: string | null) => void;
  toggleAccountEnabled: (groupId: string, accountId: string) => void;
  saveGroupRiskSetting: (groupId: string, settings: RiskSettings) => void;
  clearGroupRiskSetting: (groupId: string) => void;
  applyGroupRuntimePreference: (
    groupId: string,
    preference: "ready" | "paused" | "emergency_stopped",
  ) => void;
}

export interface AccountGroupsBoardRuntimeState {
  laneRuntimeByGroupId: Map<string, AccountGroupsBoardLaneRuntime>;
  isCopyGroupSnapshotLoading: boolean;
  isCopyGroupSnapshotError: boolean;
  pendingLifecycleGroupId: string | null;
  boardView: "compact" | "detailed";
  isMasterTokenDrag: boolean;
  activeAccount: Account | null;
}

export interface AccountGroupsBoardRiskState {
  groupRiskSettings: Record<string, Partial<RiskSettings> | undefined>;
  accountRiskById: Record<string, AccountRiskItem | undefined>;
}
