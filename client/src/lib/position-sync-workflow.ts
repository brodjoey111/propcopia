export interface PositionSyncOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface PositionSyncWorkflowEntry {
  status: "reviewed" | "simulated" | "approved" | "handed_off" | "completed_manually";
  note?: string;
  operatorName?: string;
  operatorHistory?: PositionSyncOperatorAssignment[];
  reviewedAt?: string;
  simulatedAt?: string;
  approvedAt?: string;
  handedOffAt?: string;
  completedManuallyAt?: string;
}

export type PositionSyncWorkflowState = Record<string, PositionSyncWorkflowEntry>;

export interface PositionSyncWorkflowSaveInput {
  groupId: string;
  followerAccountId: string;
  status: "reviewed" | "simulated" | "approved" | "handed_off" | "completed_manually";
  note?: string;
  operatorName?: string;
  operatorHistory?: PositionSyncOperatorAssignment[];
  reviewedAt?: string;
  simulatedAt?: string;
  approvedAt?: string;
  handedOffAt?: string;
  completedManuallyAt?: string;
}

export function buildPositionSyncWorkflowKey(
  groupId: string,
  followerAccountId: string,
): string {
  return `${groupId}:${followerAccountId}`;
}

export function appendPositionSyncOperatorAssignment(
  history: PositionSyncOperatorAssignment[] | undefined,
  operatorName: string | undefined,
  assignedAt: string,
  reason?: string,
): PositionSyncOperatorAssignment[] | undefined {
  if (!operatorName) {
    return history;
  }

  const nextHistory = history ? [...history] : [];
  const previousAssignment = nextHistory[nextHistory.length - 1];

  if (previousAssignment?.operatorName === operatorName) {
    return nextHistory;
  }

  nextHistory.push({
    operatorName,
    assignedAt,
    reason,
  });

  return nextHistory;
}

export function toPositionSyncWorkflowState(
  entries: PositionSyncWorkflowSaveInput[],
): PositionSyncWorkflowState {
  return Object.fromEntries(
    entries.map((entry) => [
      buildPositionSyncWorkflowKey(entry.groupId, entry.followerAccountId),
      {
        status: entry.status,
        note: entry.note,
        operatorName: entry.operatorName,
        operatorHistory: entry.operatorHistory,
        reviewedAt: entry.reviewedAt,
        simulatedAt: entry.simulatedAt,
        approvedAt: entry.approvedAt,
        handedOffAt: entry.handedOffAt,
        completedManuallyAt: entry.completedManuallyAt,
      } satisfies PositionSyncWorkflowEntry,
    ]),
  );
}
