import type { PositionSyncOverviewResponse } from "./runtime-overview";
import type {
  PositionSyncOperatorAssignment,
  PositionSyncWorkflowSaveInput,
} from "./position-sync-workflow";
import {
  buildPositionSyncRepairProfile,
  buildPositionSyncRepairRecommendations,
} from "./position-sync";

export interface PositionSyncQueueEntry {
  key: string;
  groupId: string;
  groupName: string;
  followerAccountId: string;
  followerName: string;
  status: "reviewed" | "simulated" | "approved" | "handed_off" | "completed_manually";
  note?: string;
  operatorName?: string;
  operatorHistory?: PositionSyncOperatorAssignment[];
  reviewedAt?: string;
  simulatedAt?: string;
  approvedAt?: string;
  handedOffAt?: string;
  completedManuallyAt?: string;
  summary: string;
  adjustmentCount: number;
  topAdjustments: string[];
  complexityScore: number;
  stageGuidance: string;
  ageMinutes: number;
  needsAttention: boolean;
  attentionLabel?: string;
  reassignmentCount: number;
  latestAssignmentReason?: string;
}

export type PositionSyncQueueFilter =
  | "all"
  | "reviewed"
  | "simulated"
  | "approved"
  | "handed_off"
  | "completed_manually";

export interface PositionSyncRepairCandidateEntry {
  key: string;
  groupId: string;
  groupName: string;
  followerAccountId: string;
  followerName: string;
  adjustmentCount: number;
  recommendation: "auto_ready" | "manual_review";
  recommendationLabel: string;
  recommendationReason: string;
  complexity: "low" | "medium" | "high";
  complexityLabel: string;
  complexityScore: number;
  workflowStatus: PositionSyncWorkflowSaveInput["status"] | "not_started";
  workflowLabel: string;
  stageGuidance: string;
  workflowTimestamp?: string;
  workflowTimestampLabel: string;
  ageMinutes: number;
  needsAttention: boolean;
  attentionLabel?: string;
  operatorName?: string;
  operatorHistory?: PositionSyncOperatorAssignment[];
  stageHistory: Array<{
    label: string;
    timestamp: string;
  }>;
  topAdjustments: string[];
}

export type PositionSyncRepairCandidateFilter =
  | "all"
  | "auto_ready"
  | "ready_to_simulate"
  | "manual_review"
  | "not_started"
  | "in_progress";

export interface PositionSyncRepairBoardSummary {
  total: number;
  autoReady: number;
  readyToSimulate: number;
  manualReview: number;
  lowComplexity: number;
  mediumComplexity: number;
  highComplexity: number;
  totalComplexityScore: number;
  notStarted: number;
  inProgress: number;
  needsAttention: number;
  unowned: number;
}

export function describePositionSyncRepairStageGuidance(input: {
  workflowStatus: PositionSyncRepairCandidateEntry["workflowStatus"];
  complexity: PositionSyncRepairCandidateEntry["complexity"];
}): string {
  if (input.workflowStatus === "completed_manually") {
    return "Completed manually. Keep the note trail intact for later audit follow-up.";
  }

  if (input.workflowStatus === "handed_off") {
    return "Follow through on the assigned sync window and mark the item completed after manual execution.";
  }

  if (input.workflowStatus === "approved") {
    return input.complexity === "high"
      ? "Approved for handoff. Reconfirm the reversal path before the operator executes it manually."
      : "Approved for handoff in the next operator sync window.";
  }

  if (input.workflowStatus === "simulated") {
    return input.complexity === "low"
      ? "Simulation is done. If balances still match, this candidate is ready for approval."
      : input.complexity === "medium"
        ? "Simulation is done. Recheck every open and multi-step adjustment before approval."
        : "Simulation is done. Walk the full reversal path once more before approval.";
  }

  if (input.workflowStatus === "reviewed") {
    return input.complexity === "low"
      ? "Reviewed and ready for a quick simulation pass."
      : input.complexity === "medium"
        ? "Reviewed. Simulate the full plan and verify each open or multi-step change."
        : "Reviewed. Simulate symbol-by-symbol and confirm the reversal path carefully.";
  }

  return input.complexity === "low"
    ? "Start with a quick review, then move into simulation if the current balances still line up."
    : input.complexity === "medium"
      ? "Start with a full plan review before simulating each step."
      : "Start with a careful manual walkthrough before attempting simulation.";
}

function getQueueEntryTimestamp(entry: Pick<
  PositionSyncQueueEntry,
  "completedManuallyAt" | "handedOffAt" | "approvedAt" | "reviewedAt" | "simulatedAt"
>): string {
  return (
    entry.completedManuallyAt ??
    entry.handedOffAt ??
    entry.approvedAt ??
    entry.reviewedAt ??
    entry.simulatedAt ??
    ""
  );
}

function getAgeMinutes(timestamp: string, now: Date): number {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 60_000));
}

function buildAttentionState(
  status: PositionSyncQueueEntry["status"],
  ageMinutes: number,
): Pick<PositionSyncQueueEntry, "needsAttention" | "attentionLabel"> {
  if (status === "approved" && ageMinutes >= 30) {
    return {
      needsAttention: true,
      attentionLabel: "Approval waiting for handoff",
    };
  }

  if (status === "handed_off" && ageMinutes >= 30) {
    return {
      needsAttention: true,
      attentionLabel: "Handoff waiting for completion",
    };
  }

  return {
    needsAttention: false,
    attentionLabel: undefined,
  };
}

function buildRepairCandidateWorkflowTimestamp(review?: PositionSyncWorkflowSaveInput): {
  workflowTimestamp?: string;
  workflowTimestampLabel: string;
} {
  if (!review) {
    return {
      workflowTimestamp: undefined,
      workflowTimestampLabel: "Not started yet",
    };
  }

  if (review.status === "completed_manually" && review.completedManuallyAt) {
    return {
      workflowTimestamp: review.completedManuallyAt,
      workflowTimestampLabel: "Completed manually",
    };
  }

  if (review.status === "handed_off" && review.handedOffAt) {
    return {
      workflowTimestamp: review.handedOffAt,
      workflowTimestampLabel: "Handed off",
    };
  }

  if (review.status === "approved" && review.approvedAt) {
    return {
      workflowTimestamp: review.approvedAt,
      workflowTimestampLabel: "Approved",
    };
  }

  if (review.status === "reviewed" && review.reviewedAt) {
    return {
      workflowTimestamp: review.reviewedAt,
      workflowTimestampLabel: "Reviewed",
    };
  }

  if (review.simulatedAt) {
    return {
      workflowTimestamp: review.simulatedAt,
      workflowTimestampLabel: "Simulated",
    };
  }

  return {
    workflowTimestamp: undefined,
    workflowTimestampLabel: "Status saved",
  };
}

function buildRepairCandidateAttentionState(input: {
  workflowStatus: PositionSyncRepairCandidateEntry["workflowStatus"];
  ageMinutes: number;
}): Pick<PositionSyncRepairCandidateEntry, "needsAttention" | "attentionLabel"> {
  if (input.workflowStatus === "reviewed" && input.ageMinutes >= 30) {
    return {
      needsAttention: true,
      attentionLabel: "Reviewed candidate waiting for simulation",
    };
  }

  if (input.workflowStatus === "simulated" && input.ageMinutes >= 30) {
    return {
      needsAttention: true,
      attentionLabel: "Simulation waiting for approval",
    };
  }

  if (input.workflowStatus === "approved" && input.ageMinutes >= 30) {
    return {
      needsAttention: true,
      attentionLabel: "Approved candidate waiting for queue follow-through",
    };
  }

  return {
    needsAttention: false,
    attentionLabel: undefined,
  };
}

function buildRepairCandidateStageHistory(
  review?: PositionSyncWorkflowSaveInput,
): PositionSyncRepairCandidateEntry["stageHistory"] {
  if (!review) {
    return [];
  }

  const items: PositionSyncRepairCandidateEntry["stageHistory"] = [];

  if (review.reviewedAt) {
    items.push({
      label: "Reviewed",
      timestamp: review.reviewedAt,
    });
  }

  if (review.simulatedAt) {
    items.push({
      label: "Simulated",
      timestamp: review.simulatedAt,
    });
  }

  if (review.approvedAt) {
    items.push({
      label: "Approved",
      timestamp: review.approvedAt,
    });
  }

  if (review.handedOffAt) {
    items.push({
      label: "Handed Off",
      timestamp: review.handedOffAt,
    });
  }

  if (review.completedManuallyAt) {
    items.push({
      label: "Completed",
      timestamp: review.completedManuallyAt,
    });
  }

  return items.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function buildPositionSyncQueue(
  overview: PositionSyncOverviewResponse | null | undefined,
  reviews: PositionSyncWorkflowSaveInput[],
  now: Date = new Date(),
): PositionSyncQueueEntry[] {
  if (!overview) {
    return [];
  }

  const groupsById = new Map(overview.groups.map((group) => [group.groupId, group]));
  const entriesByKey = new Map<string, PositionSyncQueueEntry>();

  for (const review of reviews) {
    const group = groupsById.get(review.groupId);
    const follower = group?.followers.find(
      (item) => item.followerAccountId === review.followerAccountId,
    );

    if (!group || !follower) {
      continue;
    }

    const key = `${review.groupId}:${review.followerAccountId}`;
    const latestTimestamp = getQueueEntryTimestamp({
      completedManuallyAt: review.completedManuallyAt,
      handedOffAt: review.handedOffAt,
      approvedAt: review.approvedAt,
      reviewedAt: review.reviewedAt,
      simulatedAt: review.simulatedAt,
    });
    const ageMinutes = getAgeMinutes(latestTimestamp, now);
    const attentionState = buildAttentionState(review.status, ageMinutes);
    const repairProfile = buildPositionSyncRepairProfile({
      adjustmentCount: follower.adjustmentCount,
      adjustments: follower.adjustments,
    });
    const nextEntry: PositionSyncQueueEntry = {
      key,
      groupId: review.groupId,
      groupName: group.groupName,
      followerAccountId: review.followerAccountId,
      followerName: follower.followerName,
      status: review.status,
      note: review.note,
      operatorName: review.operatorName,
      operatorHistory: review.operatorHistory,
      reviewedAt: review.reviewedAt,
      simulatedAt: review.simulatedAt,
      approvedAt: review.approvedAt,
      handedOffAt: review.handedOffAt,
      completedManuallyAt: review.completedManuallyAt,
      summary: follower.summary,
      adjustmentCount: follower.adjustmentCount,
      topAdjustments: follower.adjustments.slice(0, 2).map((adjustment) => adjustment.symbol),
      complexityScore: repairProfile.complexityScore,
      stageGuidance: describePositionSyncRepairStageGuidance({
        workflowStatus: review.status,
        complexity: repairProfile.complexity,
      }),
      ageMinutes,
      needsAttention: attentionState.needsAttention,
      attentionLabel: attentionState.attentionLabel,
      reassignmentCount: Math.max((review.operatorHistory?.length ?? 0) - 1, 0),
      latestAssignmentReason: review.operatorHistory?.[review.operatorHistory.length - 1]?.reason,
    };

    const previousEntry = entriesByKey.get(key);
    const previousTimestamp = previousEntry ? getQueueEntryTimestamp(previousEntry) : "";
    const nextTimestamp = getQueueEntryTimestamp(nextEntry);

    if (!previousEntry || nextTimestamp.localeCompare(previousTimestamp) >= 0) {
      entriesByKey.set(key, nextEntry);
    }
  }

  return Array.from(entriesByKey.values())
    .sort((left, right) => {
      const leftTimestamp = getQueueEntryTimestamp(left);
      const rightTimestamp = getQueueEntryTimestamp(right);
      return rightTimestamp.localeCompare(leftTimestamp);
    });
}

export function filterPositionSyncQueue(
  entries: PositionSyncQueueEntry[],
  filter: PositionSyncQueueFilter,
  search: string,
): PositionSyncQueueEntry[] {
  const normalizedSearch = search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filter !== "all" && entry.status !== filter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      entry.groupName,
      entry.followerName,
      entry.note ?? "",
      ...entry.topAdjustments,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

export function buildPositionSyncRepairCandidateQueue(
  overview: PositionSyncOverviewResponse | null | undefined,
  reviews: PositionSyncWorkflowSaveInput[],
  now: Date = new Date(),
): PositionSyncRepairCandidateEntry[] {
  if (!overview) {
    return [];
  }

  const reviewByKey = new Map<string, PositionSyncWorkflowSaveInput>(
    reviews.map((review) => [`${review.groupId}:${review.followerAccountId}`, review]),
  );
  const groupsById = new Map(overview.groups.map((group) => [group.groupId, group]));

  return buildPositionSyncRepairRecommendations(overview.groups)
    .flatMap((recommendation) => {
      const key = `${recommendation.groupId}:${recommendation.followerAccountId}`;
      const review = reviewByKey.get(key);
      const follower = groupsById.get(recommendation.groupId)?.followers.find(
        (item) => item.followerAccountId === recommendation.followerAccountId,
      );

      if (!follower) {
        return [];
      }

      const workflowStatus: PositionSyncRepairCandidateEntry["workflowStatus"] =
        review?.status ?? "not_started";
      const workflowTimestampState = buildRepairCandidateWorkflowTimestamp(review);
      const ageMinutes = workflowTimestampState.workflowTimestamp
        ? getAgeMinutes(workflowTimestampState.workflowTimestamp, now)
        : 0;
      const attentionState = buildRepairCandidateAttentionState({
        workflowStatus,
        ageMinutes,
      });

      return [{
        key,
        groupId: recommendation.groupId,
        groupName: recommendation.groupName,
        followerAccountId: recommendation.followerAccountId,
        followerName: recommendation.followerName,
        adjustmentCount: recommendation.adjustmentCount,
        recommendation: recommendation.recommendation,
        recommendationLabel:
          recommendation.recommendation === "auto_ready"
            ? "Auto-ready next"
            : "Manual review first",
        recommendationReason: recommendation.reason,
        complexity: recommendation.complexity,
        complexityLabel: recommendation.complexityLabel,
        complexityScore: recommendation.complexityScore,
        workflowStatus,
        workflowLabel:
          workflowStatus === "reviewed"
            ? "Reviewed"
            : workflowStatus === "simulated"
              ? "Simulated"
              : workflowStatus === "approved"
                ? "Approved"
                : workflowStatus === "handed_off"
                  ? "Handed Off"
                  : workflowStatus === "completed_manually"
                  ? "Completed"
                    : "Not started",
        stageGuidance: describePositionSyncRepairStageGuidance({
          workflowStatus,
          complexity: recommendation.complexity,
        }),
        workflowTimestamp: workflowTimestampState.workflowTimestamp,
        workflowTimestampLabel: workflowTimestampState.workflowTimestampLabel,
        ageMinutes,
        needsAttention: attentionState.needsAttention,
        attentionLabel: attentionState.attentionLabel,
        operatorName: review?.operatorName,
        operatorHistory: review?.operatorHistory,
        stageHistory: buildRepairCandidateStageHistory(review),
        topAdjustments: follower.adjustments.slice(0, 2).map((adjustment) => adjustment.symbol),
      }];
    })
    .sort((left, right) => {
      if (left.recommendation !== right.recommendation) {
        return left.recommendation === "auto_ready" ? -1 : 1;
      }

      if (left.complexity !== right.complexity) {
        const order = new Map<PositionSyncRepairCandidateEntry["complexity"], number>([
          ["low", 0],
          ["medium", 1],
          ["high", 2],
        ]);
        return (order.get(left.complexity) ?? 99) - (order.get(right.complexity) ?? 99);
      }

      if (left.complexityScore !== right.complexityScore) {
        return left.complexityScore - right.complexityScore;
      }

      if (left.workflowStatus !== right.workflowStatus) {
        return left.workflowStatus === "not_started" ? -1 : 1;
      }

      return left.groupName.localeCompare(right.groupName) || left.followerName.localeCompare(right.followerName);
    });
}

export function filterPositionSyncRepairCandidateQueue(
  entries: PositionSyncRepairCandidateEntry[],
  filter: PositionSyncRepairCandidateFilter,
  search: string,
): PositionSyncRepairCandidateEntry[] {
  const normalizedSearch = search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filter === "auto_ready" && entry.recommendation !== "auto_ready") {
      return false;
    }

    if (
      filter === "ready_to_simulate" &&
      !(
        entry.recommendation === "auto_ready" &&
        entry.complexity === "low" &&
        entry.workflowStatus === "reviewed"
      )
    ) {
      return false;
    }

    if (filter === "manual_review" && entry.recommendation !== "manual_review") {
      return false;
    }

    if (filter === "not_started" && entry.workflowStatus !== "not_started") {
      return false;
    }

    if (
      filter === "in_progress" &&
      (entry.workflowStatus === "not_started" || entry.workflowStatus === "completed_manually")
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      entry.groupName,
      entry.followerName,
      entry.recommendationLabel,
      entry.recommendationReason,
      entry.workflowLabel,
      ...entry.topAdjustments,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

export function summarizePositionSyncRepairCandidateQueue(
  entries: PositionSyncRepairCandidateEntry[],
): PositionSyncRepairBoardSummary {
  return {
    total: entries.length,
    autoReady: entries.filter((entry) => entry.recommendation === "auto_ready").length,
    readyToSimulate: entries.filter(
      (entry) =>
        entry.recommendation === "auto_ready" &&
        entry.complexity === "low" &&
        entry.workflowStatus === "reviewed",
    ).length,
    manualReview: entries.filter((entry) => entry.recommendation === "manual_review").length,
    lowComplexity: entries.filter((entry) => entry.complexity === "low").length,
    mediumComplexity: entries.filter((entry) => entry.complexity === "medium").length,
    highComplexity: entries.filter((entry) => entry.complexity === "high").length,
    totalComplexityScore: entries.reduce((sum, entry) => sum + entry.complexityScore, 0),
    notStarted: entries.filter((entry) => entry.workflowStatus === "not_started").length,
    inProgress: entries.filter(
      (entry) => entry.workflowStatus !== "not_started" && entry.workflowStatus !== "completed_manually",
    ).length,
    needsAttention: entries.filter((entry) => entry.needsAttention).length,
    unowned: entries.filter(
      (entry) =>
        entry.workflowStatus !== "not_started" &&
        entry.workflowStatus !== "completed_manually" &&
        !entry.operatorName,
    ).length,
  };
}
