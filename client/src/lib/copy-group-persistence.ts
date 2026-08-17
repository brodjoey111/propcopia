import type { CopyGroupSnapshotApiResponse } from "@/lib/copy-groups";
import type { Account } from "@shared/schema";

import type { RiskSettings } from "@/components/risk-settings-dialog";

export interface PersistedTradingGroup {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  masterId: string | null;
  disabledAccountIds: string[];
  runtimePreference?: "ready" | "paused" | "emergency_stopped";
}

export interface HydratedCopyGroupBoardState {
  groups: PersistedTradingGroup[];
  assignments: Record<string, string>;
  groupRiskSettings: Record<string, Partial<RiskSettings>>;
}

interface BuildCopyGroupSyncPlanInput {
  userId: string;
  groups: PersistedTradingGroup[];
  assignments: Record<string, string>;
  accounts: Account[];
  groupRiskSettings?: Record<string, Partial<RiskSettings>>;
  registeredGroupIds?: string[];
}

export interface CopyGroupSyncPayload {
  board?: {
    color?: string;
    position?: number;
    riskSettings?: Partial<RiskSettings>;
  };
  group: {
    groupId: string;
    userId: string;
    name: string;
    masterAccountId: string;
    followerAccountIds: string[];
    groupSettings: {
      enabled: boolean;
      allowedSymbols?: string[];
      blockedSymbols?: string[];
    };
    riskSettings: {
      maxGroupNotional?: number;
      maxGroupContracts?: number;
      maxDailyLoss?: number;
      onRiskBreach: "PAUSE" | "STOP" | "FLATTEN_AND_STOP";
    };
    executionSettings: {
      mode: "LIVE" | "SIMULATED";
      maxRetries: number;
      retryDelayMs: number;
      orderTimeoutMs: number;
      flattenOnEmergencyStop: boolean;
    };
    createdAt: string;
    updatedAt: string;
  };
  followers: Array<{
    groupId: string;
    followerAccountId: string;
    enabled: boolean;
    sizingMode?: "MULTIPLIER" | "FIXED";
    fixedQuantity?: number;
    multiplier?: number;
    reverseCopy?: boolean;
    maxContracts?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  runtimeState: {
    groupId: string;
    status: "STOPPED" | "PAUSED" | "EMERGENCY_STOPPED";
    isKillSwitchActive: boolean;
    masterConnected: boolean;
    connectedFollowerCount: number;
    totalFollowerCount: number;
    pausedAt?: string;
    stoppedAt?: string;
    emergencyStoppedAt?: string;
  };
}

function toCopyGroupRiskAction(
  action: RiskSettings["onBreachAction"] | undefined,
): "PAUSE" | "STOP" | "FLATTEN_AND_STOP" {
  if (action === "close_and_pause") {
    return "FLATTEN_AND_STOP";
  }

  if (action === "alert") {
    return "STOP";
  }

  return "PAUSE";
}

function getAssignedAccountIds(
  assignments: Record<string, string>,
  groupId: string,
): string[] {
  return Object.entries(assignments)
    .filter(([, assignedGroupId]) => assignedGroupId === groupId)
    .map(([accountId]) => accountId);
}

export function buildCopyGroupRuntimeState(
  input: Pick<PersistedTradingGroup, "id" | "isActive" | "runtimePreference"> & {
    totalFollowerCount: number;
    nowIso: string;
  },
): CopyGroupSyncPayload["runtimeState"] {
  if (input.runtimePreference === "emergency_stopped") {
    return {
      groupId: input.id,
      status: "EMERGENCY_STOPPED",
      isKillSwitchActive: true,
      masterConnected: false,
      connectedFollowerCount: 0,
      totalFollowerCount: input.totalFollowerCount,
      emergencyStoppedAt: input.nowIso,
    };
  }

  if (input.runtimePreference === "paused" || !input.isActive) {
    return {
      groupId: input.id,
      status: "PAUSED",
      isKillSwitchActive: false,
      masterConnected: false,
      connectedFollowerCount: 0,
      totalFollowerCount: input.totalFollowerCount,
      pausedAt: input.nowIso,
    };
  }

  return {
    groupId: input.id,
    status: "STOPPED",
    isKillSwitchActive: false,
    masterConnected: false,
    connectedFollowerCount: 0,
    totalFollowerCount: input.totalFollowerCount,
    stoppedAt: input.nowIso,
  };
}

export function buildCopyGroupSyncPlan(
  input: BuildCopyGroupSyncPlanInput,
): {
  payloads: CopyGroupSyncPayload[];
  desiredGroupIds: string[];
  removedGroupIds: string[];
} {
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const nowIso = new Date().toISOString();
  const payloads: CopyGroupSyncPayload[] = [];

  for (let position = 0; position < input.groups.length; position += 1) {
    const group = input.groups[position];
    if (!group.masterId) {
      continue;
    }

    const masterAccount = accountById.get(group.masterId);
    if (!masterAccount) {
      continue;
    }

    const assignedAccountIds = getAssignedAccountIds(input.assignments, group.id);
    const followerAccountIds = assignedAccountIds.filter((accountId) => accountId !== group.masterId);
    const riskSettings = input.groupRiskSettings?.[group.id];

    payloads.push({
      board: {
        color: group.color,
        position,
        riskSettings,
      },
      group: {
        groupId: group.id,
        userId: input.userId,
        name: group.name,
        masterAccountId: masterAccount.id,
        followerAccountIds,
        groupSettings: {
          enabled: true,
          allowedSymbols:
            riskSettings?.allowedTickers && riskSettings.allowedTickers.length > 0
              ? riskSettings.allowedTickers
              : undefined,
          blockedSymbols:
            riskSettings?.blockedTickers && riskSettings.blockedTickers.length > 0
              ? riskSettings.blockedTickers
              : undefined,
        },
        riskSettings: {
          maxGroupNotional: undefined,
          maxGroupContracts: riskSettings?.maxContracts ?? undefined,
          maxDailyLoss: riskSettings?.maxDailyLoss ?? undefined,
          onRiskBreach: toCopyGroupRiskAction(riskSettings?.onBreachAction),
        },
        executionSettings: {
          mode: "SIMULATED",
          maxRetries: 0,
          retryDelayMs: 1000,
          orderTimeoutMs: 5000,
          flattenOnEmergencyStop: riskSettings?.onBreachAction === "close_and_pause",
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      followers: followerAccountIds.map((followerAccountId) => {
        const followerAccount = accountById.get(followerAccountId);
        return {
          groupId: group.id,
          followerAccountId,
          enabled: !(group.disabledAccountIds ?? []).includes(followerAccountId),
          sizingMode:
            followerAccount?.copySizingMode === "FIXED" ? "FIXED" : "MULTIPLIER",
          fixedQuantity: followerAccount?.fixedQuantity ?? undefined,
          multiplier:
            typeof followerAccount?.positionScaling === "number"
              ? followerAccount.positionScaling / 100
              : undefined,
          reverseCopy: followerAccount?.reverseCopying ?? undefined,
          maxContracts: followerAccount?.maxContracts ?? undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      }),
      runtimeState: buildCopyGroupRuntimeState({
        id: group.id,
        isActive: group.isActive,
        runtimePreference: group.runtimePreference,
        totalFollowerCount: followerAccountIds.length,
        nowIso,
      }),
    });
  }

  const desiredGroupIds = payloads.map((payload) => payload.group.groupId);
  const removedGroupIds = (input.registeredGroupIds ?? []).filter(
    (groupId) => !desiredGroupIds.includes(groupId),
  );

  return {
    payloads,
    desiredGroupIds,
    removedGroupIds,
  };
}

export function hydrateBoardStateFromSnapshot(
  snapshot: CopyGroupSnapshotApiResponse,
  currentGroups: PersistedTradingGroup[] = [],
): HydratedCopyGroupBoardState {
  const currentGroupById = new Map(currentGroups.map((group) => [group.id, group]));
  const groupRiskSettings = Object.fromEntries(
    snapshot.groups
      .filter((registeredGroup) => registeredGroup.board?.riskSettings)
      .map((registeredGroup) => [
        registeredGroup.group.group.groupId,
        registeredGroup.board?.riskSettings ?? {},
      ]),
  );
  const groups = [...snapshot.groups]
    .sort((left, right) => {
      const leftPosition = left.board?.position ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = right.board?.position ?? Number.MAX_SAFE_INTEGER;

      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }

      return left.group.group.groupId.localeCompare(right.group.group.groupId);
    })
    .map((registeredGroup) => {
    const state = registeredGroup.runtime?.state;
    const status = state?.status ?? "STOPPED";
    const currentGroup = currentGroupById.get(registeredGroup.group.group.groupId);

    return {
      id: registeredGroup.group.group.groupId,
      name: registeredGroup.group.group.name,
      color: registeredGroup.board?.color ?? currentGroup?.color ?? "#3b82f6",
      isActive: status !== "PAUSED" && status !== "EMERGENCY_STOPPED",
      masterId: registeredGroup.group.group.masterAccountId,
      disabledAccountIds: currentGroup?.disabledAccountIds ?? [],
      runtimePreference:
        status === "EMERGENCY_STOPPED"
          ? "emergency_stopped"
          : status === "PAUSED"
            ? "paused"
            : "ready",
    } satisfies PersistedTradingGroup;
  });

  const assignments = Object.fromEntries(
    snapshot.groups.flatMap((registeredGroup) => [
      [registeredGroup.group.group.masterAccountId, registeredGroup.group.group.groupId],
      ...registeredGroup.group.group.followerAccountIds.map((accountId) => [
        accountId,
        registeredGroup.group.group.groupId,
      ] as const),
    ]),
  );

  return {
    groups,
    assignments,
    groupRiskSettings,
  };
}
