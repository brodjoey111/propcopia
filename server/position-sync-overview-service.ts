import type { Account } from "@shared/schema";
import type { RegisteredCopyGroup } from "./copy-group-manager";
import type { PositionSnapshotResult } from "./position-snapshot-service";
import {
  buildFollowerPositionSyncPlan,
  type PositionSyncAdjustment,
  type PositionSyncPlan,
} from "./position-sync-service";

export interface PositionSyncFollowerOverviewItem {
  followerAccountId: string;
  followerName: string;
  status: PositionSyncPlan["status"];
  summary: string;
  adjustmentCount: number;
  adjustments: PositionSyncAdjustment[];
}

export interface PositionSyncGroupOverviewItem {
  groupId: string;
  groupName: string;
  masterAccountId: string;
  masterAccountName: string;
  status: "IN_SYNC" | "OUT_OF_SYNC" | "UNAVAILABLE";
  summary: string;
  followerCount: number;
  outOfSyncFollowers: number;
  unavailableFollowers: number;
  followers: PositionSyncFollowerOverviewItem[];
}

export interface PositionSyncOverviewResult {
  generatedAt: string;
  summary: {
    totalGroups: number;
    inSyncGroups: number;
    outOfSyncGroups: number;
    unavailableGroups: number;
    outOfSyncFollowers: number;
    unavailableFollowers: number;
  };
  groups: PositionSyncGroupOverviewItem[];
}

export function filterPositionSyncOverviewByGroupId(
  overview: PositionSyncOverviewResult,
  groupId: string,
): PositionSyncOverviewResult {
  const groups = overview.groups.filter((group) => group.groupId === groupId);

  return {
    generatedAt: overview.generatedAt,
    summary: {
      totalGroups: groups.length,
      inSyncGroups: groups.filter((group) => group.status === "IN_SYNC").length,
      outOfSyncGroups: groups.filter((group) => group.status === "OUT_OF_SYNC").length,
      unavailableGroups: groups.filter((group) => group.status === "UNAVAILABLE").length,
      outOfSyncFollowers: groups.reduce(
        (sum, group) => sum + group.outOfSyncFollowers,
        0,
      ),
      unavailableFollowers: groups.reduce(
        (sum, group) => sum + group.unavailableFollowers,
        0,
      ),
    },
    groups,
  };
}

function summarizeGroupSyncStatus(input: {
  masterAvailable: boolean;
  followerPlans: PositionSyncPlan[];
}): Pick<
  PositionSyncGroupOverviewItem,
  "status" | "summary" | "outOfSyncFollowers" | "unavailableFollowers"
> {
  const outOfSyncFollowers = input.followerPlans.filter(
    (plan) => plan.status === "OUT_OF_SYNC",
  ).length;
  const unavailableFollowers = input.followerPlans.filter(
    (plan) => plan.status === "UNAVAILABLE",
  ).length;

  if (!input.masterAvailable) {
    return {
      status: "UNAVAILABLE",
      summary: "Master positions are not available yet.",
      outOfSyncFollowers,
      unavailableFollowers,
    };
  }

  if (input.followerPlans.length === 0) {
    return {
      status: "IN_SYNC",
      summary: "No followers assigned to this group yet.",
      outOfSyncFollowers: 0,
      unavailableFollowers: 0,
    };
  }

  if (outOfSyncFollowers > 0) {
    return {
      status: "OUT_OF_SYNC",
      summary: `${outOfSyncFollowers} follower${outOfSyncFollowers === 1 ? "" : "s"} need position adjustments.`,
      outOfSyncFollowers,
      unavailableFollowers,
    };
  }

  if (unavailableFollowers > 0) {
    return {
      status: "UNAVAILABLE",
      summary: `${unavailableFollowers} follower${unavailableFollowers === 1 ? "" : "s"} are still waiting on live positions.`,
      outOfSyncFollowers,
      unavailableFollowers,
    };
  }

  return {
    status: "IN_SYNC",
    summary: "Followers are aligned with the master.",
    outOfSyncFollowers: 0,
    unavailableFollowers: 0,
  };
}

export function buildPositionSyncOverview(input: {
  userAccounts: Account[];
  registeredGroups: RegisteredCopyGroup[];
  positionSnapshot: PositionSnapshotResult;
}): PositionSyncOverviewResult {
  const accountsById = new Map(
    input.userAccounts.map((account) => [account.id, account]),
  );
  const snapshotsById = new Map(
    input.positionSnapshot.accounts.map((snapshot) => [snapshot.accountId, snapshot]),
  );

  const groups = input.registeredGroups.map((registeredGroup) => {
    const masterAccount = accountsById.get(registeredGroup.group.masterAccountId);
    const masterSnapshot = snapshotsById.get(registeredGroup.group.masterAccountId);
    const followerPlans = registeredGroup.followers.map((follower) => {
      const followerAccount = accountsById.get(follower.followerAccountId);
      const followerSnapshot = snapshotsById.get(follower.followerAccountId);

      if (!followerAccount || !followerSnapshot || !masterSnapshot) {
        return {
          followerAccountId: follower.followerAccountId,
          followerName: followerAccount?.name ?? follower.followerAccountId,
          status: "UNAVAILABLE" as const,
          summary: "Follower positions are not available yet.",
          adjustmentCount: 0,
          adjustments: [],
        };
      }

      const plan = buildFollowerPositionSyncPlan({
        master: masterSnapshot,
        follower: followerSnapshot,
        config: {
          followerAccountId: follower.followerAccountId,
          enabled: follower.enabled,
          positionScaling:
            follower.multiplier != null
              ? Math.round(follower.multiplier * 100)
              : followerAccount.positionScaling,
          copySizingMode:
            (follower.sizingMode as "MULTIPLIER" | "FIXED" | undefined) ??
            (followerAccount.copySizingMode as "MULTIPLIER" | "FIXED" | null | undefined),
          fixedQuantity: follower.fixedQuantity ?? followerAccount.fixedQuantity,
          reverseCopying: follower.reverseCopy ?? followerAccount.reverseCopying,
          maxContracts: follower.maxContracts ?? followerAccount.maxContracts,
        },
      });

      return {
        followerAccountId: plan.followerAccountId,
        followerName: plan.followerName,
        status: plan.status,
        summary: plan.summary,
        adjustmentCount: plan.adjustments.length,
        adjustments: plan.adjustments,
      };
    });

    const groupStatus = summarizeGroupSyncStatus({
      masterAvailable: masterSnapshot?.status === "LIVE",
      followerPlans,
    });

    return {
      groupId: registeredGroup.group.groupId,
      groupName: registeredGroup.group.name,
      masterAccountId: registeredGroup.group.masterAccountId,
      masterAccountName: masterAccount?.name ?? registeredGroup.group.masterAccountId,
      status: groupStatus.status,
      summary: groupStatus.summary,
      followerCount: followerPlans.length,
      outOfSyncFollowers: groupStatus.outOfSyncFollowers,
      unavailableFollowers: groupStatus.unavailableFollowers,
      followers: followerPlans,
    } satisfies PositionSyncGroupOverviewItem;
  });

  return {
    generatedAt: input.positionSnapshot.generatedAt,
    summary: {
      totalGroups: groups.length,
      inSyncGroups: groups.filter((group) => group.status === "IN_SYNC").length,
      outOfSyncGroups: groups.filter((group) => group.status === "OUT_OF_SYNC").length,
      unavailableGroups: groups.filter((group) => group.status === "UNAVAILABLE").length,
      outOfSyncFollowers: groups.reduce(
        (sum, group) => sum + group.outOfSyncFollowers,
        0,
      ),
      unavailableFollowers: groups.reduce(
        (sum, group) => sum + group.unavailableFollowers,
        0,
      ),
    },
    groups,
  };
}
