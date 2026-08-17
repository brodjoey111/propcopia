import { createHash, randomUUID } from "node:crypto";

import type {
  PositionSyncAdjustment,
} from "./position-sync-service";
import type {
  PositionSyncOverviewResult,
} from "./position-sync-overview-service";

export interface PositionSyncSimulationEvidence {
  simulationId: string;
  planFingerprint: string;
  groupId: string;
  groupName: string;
  masterAccountId: string;
  followerAccountId: string;
  followerName: string;
  sourceGeneratedAt: string;
  simulatedAt: string;
  executionMode: "SIMULATION_ONLY";
  noOrdersSubmitted: true;
  adjustmentCount: number;
  adjustments: PositionSyncAdjustment[];
}

export type PositionSyncSimulationFailureReason =
  | "GROUP_NOT_FOUND"
  | "FOLLOWER_NOT_FOUND"
  | "ALREADY_IN_SYNC"
  | "FOLLOWER_DISABLED"
  | "POSITIONS_UNAVAILABLE"
  | "INVALID_PLAN";

export type PositionSyncSimulationResult =
  | { success: true; simulation: PositionSyncSimulationEvidence }
  | {
      success: false;
      reason: PositionSyncSimulationFailureReason;
      message: string;
    };

function isValidAdjustment(adjustment: PositionSyncAdjustment): boolean {
  if (
    adjustment.symbol.trim().length === 0 ||
    !Number.isSafeInteger(adjustment.currentQuantity) ||
    !Number.isSafeInteger(adjustment.targetQuantity) ||
    !Number.isSafeInteger(adjustment.deltaQuantity) ||
    adjustment.deltaQuantity !== adjustment.targetQuantity - adjustment.currentQuantity ||
    adjustment.deltaQuantity === 0
  ) {
    return false;
  }

  const expectedAction =
    adjustment.targetQuantity === 0
      ? "FLATTEN"
      : adjustment.deltaQuantity > 0
        ? "BUY"
        : "SELL";

  return adjustment.action === expectedAction;
}

function fingerprintPlan(input: {
  groupId: string;
  masterAccountId: string;
  followerAccountId: string;
  sourceGeneratedAt: string;
  adjustments: PositionSyncAdjustment[];
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildPositionSyncSimulation(input: {
  overview: PositionSyncOverviewResult;
  groupId: string;
  followerAccountId: string;
  now?: () => string;
  createId?: () => string;
}): PositionSyncSimulationResult {
  const group = input.overview.groups.find((candidate) => candidate.groupId === input.groupId);
  if (!group) {
    return {
      success: false,
      reason: "GROUP_NOT_FOUND",
      message: `Copy group not found: ${input.groupId}`,
    };
  }

  const follower = group.followers.find(
    (candidate) => candidate.followerAccountId === input.followerAccountId,
  );
  if (!follower) {
    return {
      success: false,
      reason: "FOLLOWER_NOT_FOUND",
      message: `Follower plan not found: ${input.followerAccountId}`,
    };
  }

  if (follower.status === "DISABLED") {
    return {
      success: false,
      reason: "FOLLOWER_DISABLED",
      message: "Position sync is disabled for this follower.",
    };
  }

  if (follower.status === "UNAVAILABLE") {
    return {
      success: false,
      reason: "POSITIONS_UNAVAILABLE",
      message: "Live master and follower position snapshots are required before simulation.",
    };
  }

  if (follower.status === "IN_SYNC" || follower.adjustments.length === 0) {
    return {
      success: false,
      reason: "ALREADY_IN_SYNC",
      message: "This follower is already aligned with the master.",
    };
  }

  if (!follower.adjustments.every(isValidAdjustment)) {
    return {
      success: false,
      reason: "INVALID_PLAN",
      message: "The position repair plan failed its safety validation.",
    };
  }

  const adjustments = follower.adjustments.map((adjustment) => ({ ...adjustment }));
  const planFingerprint = fingerprintPlan({
    groupId: group.groupId,
    masterAccountId: group.masterAccountId,
    followerAccountId: follower.followerAccountId,
    sourceGeneratedAt: input.overview.generatedAt,
    adjustments,
  });

  return {
    success: true,
    simulation: {
      simulationId: (input.createId ?? randomUUID)(),
      planFingerprint,
      groupId: group.groupId,
      groupName: group.groupName,
      masterAccountId: group.masterAccountId,
      followerAccountId: follower.followerAccountId,
      followerName: follower.followerName,
      sourceGeneratedAt: input.overview.generatedAt,
      simulatedAt: (input.now ?? (() => new Date().toISOString()))(),
      executionMode: "SIMULATION_ONLY",
      noOrdersSubmitted: true,
      adjustmentCount: adjustments.length,
      adjustments,
    },
  };
}
