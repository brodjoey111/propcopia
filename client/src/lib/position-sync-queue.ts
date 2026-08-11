import type { PositionSyncOverviewResponse } from "./runtime-overview";
import type {
  PositionSyncOperatorAssignment,
  PositionSyncWorkflowSaveInput,
} from "./position-sync-workflow";

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
