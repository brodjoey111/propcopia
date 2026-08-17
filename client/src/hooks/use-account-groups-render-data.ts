import {
  buildCopyGroupOperatorSummary,
  type CopyGroupOperatorLogEntry,
} from "@/lib/copy-group-operator-log";
import type {
  CopyGroupSnapshotApiResponse,
} from "@/lib/copy-groups";
import type {
  AccountGroupsBoardLane,
  AccountGroupsBoardLaneRuntime,
  UngroupedAccountGroupsBoardLane,
} from "@/components/account-groups-board-types";
import type { Account } from "@shared/schema";

interface TradingGroupLike {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  masterId: string | null;
  disabledAccountIds: string[];
}

interface UseAccountGroupsRenderDataOptions<TGroup extends TradingGroupLike> {
  isDemo: boolean;
  accounts: Account[];
  demoAccounts: Account[];
  groups: TGroup[];
  demoGroups: TGroup[];
  assignments: Record<string, string>;
  demoAssignments: Record<string, string>;
  registeredGroupsData?: CopyGroupSnapshotApiResponse;
  operatorLogByGroupId: Record<string, CopyGroupOperatorLogEntry[]>;
  activeId: string | null;
  ungroupedId: string;
  ungroupedName: string;
  demoUngroupedName: string;
}

export function selectAccountGroupsRenderCollections<TGroup extends TradingGroupLike>(
  options: Pick<
    UseAccountGroupsRenderDataOptions<TGroup>,
    | "isDemo"
    | "accounts"
    | "demoAccounts"
    | "groups"
    | "demoGroups"
    | "assignments"
    | "demoAssignments"
  >,
) {
  return {
    displayAccounts: options.isDemo ? options.demoAccounts : options.accounts,
    displayGroups: options.isDemo ? options.demoGroups : options.groups,
    displayAssign: options.isDemo
      ? options.demoAssignments
      : options.assignments,
  };
}

export function isAccountGroupsMasterTokenDrag(activeId: string | null) {
  return (
    activeId?.startsWith("master-token:") ||
    activeId?.startsWith("master-card-token:") ||
    false
  );
}

export function buildAccountGroupsBoardLanes<TGroup extends TradingGroupLike>(
  options: Pick<
    UseAccountGroupsRenderDataOptions<TGroup>,
    "isDemo" | "ungroupedId" | "ungroupedName" | "demoUngroupedName"
  > & {
    displayGroups: TGroup[];
  },
) {
  return [
    {
      id: options.ungroupedId,
      name: options.isDemo ? options.demoUngroupedName : options.ungroupedName,
      color: "#94a3b8",
      isUngrouped: true as const,
    },
    ...options.displayGroups.map((group) => ({
      ...group,
      isUngrouped: false as const,
    })),
  ] satisfies Array<UngroupedAccountGroupsBoardLane | AccountGroupsBoardLane>;
}

export function useAccountGroupsRenderData<TGroup extends TradingGroupLike>(
  options: UseAccountGroupsRenderDataOptions<TGroup>,
) {
  const { displayAccounts, displayGroups, displayAssign } =
    selectAccountGroupsRenderCollections(options);

  const runtimeSummaryByGroupId = new Map(
    (options.registeredGroupsData?.groups ?? []).map((registeredGroup) => [
      registeredGroup.group.group.groupId,
      registeredGroup.runtimeSummary,
    ]),
  );
  const operatorSummaryByGroupId = new Map(
    Object.entries(options.operatorLogByGroupId).map(([groupId, entries]) => [
      groupId,
      buildCopyGroupOperatorSummary(entries),
    ]),
  );
  const laneRuntimeByGroupId = new Map<string, AccountGroupsBoardLaneRuntime>(
    (options.registeredGroupsData?.groups ?? []).map((registeredGroup) => {
      const groupId = registeredGroup.group.group.groupId;

      return [
        groupId,
        {
          runtimeStatus: registeredGroup.runtime?.state?.status ?? "STOPPED",
          runtimeSummary: runtimeSummaryByGroupId.get(groupId),
          recentActivityPreview: registeredGroup.activityPreview,
          operatorSummary: operatorSummaryByGroupId.get(groupId) ?? null,
        },
      ];
    }),
  );

  const getGroupAccounts = (groupId: string): Account[] => {
    if (groupId === options.ungroupedId) {
      return displayAccounts.filter((account) => {
        const assignedGroupId = displayAssign[account.id];
        return !assignedGroupId || !displayGroups.find((group) => group.id === assignedGroupId);
      });
    }

    return displayAccounts.filter((account) => displayAssign[account.id] === groupId);
  };

  const isMasterTokenDrag = isAccountGroupsMasterTokenDrag(options.activeId);
  const activeAccount =
    options.activeId && !isMasterTokenDrag
      ? displayAccounts.find((account) => account.id === options.activeId) ?? null
      : null;
  const ungroupedAccounts = getGroupAccounts(options.ungroupedId);

  const lanes = buildAccountGroupsBoardLanes({
    isDemo: options.isDemo,
    ungroupedId: options.ungroupedId,
    ungroupedName: options.ungroupedName,
    demoUngroupedName: options.demoUngroupedName,
    displayGroups,
  });

  return {
    displayAccounts,
    displayGroups,
    displayAssign,
    laneRuntimeByGroupId,
    getGroupAccounts,
    isMasterTokenDrag,
    activeAccount,
    ungroupedAccounts,
    lanes,
  };
}
