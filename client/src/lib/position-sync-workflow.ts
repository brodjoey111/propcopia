export interface PositionSyncOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

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
  adjustments: Array<{
    symbol: string;
    currentQuantity: number;
    targetQuantity: number;
    deltaQuantity: number;
    action: "BUY" | "SELL" | "FLATTEN";
    reason: "OPEN" | "INCREASE" | "REDUCE" | "REVERSE" | "FLATTEN_EXTRA";
  }>;
}

export interface PositionSyncWorkflowEntry {
  status: "reviewed" | "simulated" | "approved" | "handed_off" | "completed_manually";
  note?: string;
  operatorName?: string;
  operatorHistory?: PositionSyncOperatorAssignment[];
  reviewedAt?: string;
  simulatedAt?: string;
  simulationId?: string;
  simulationFingerprint?: string;
  simulationSourceGeneratedAt?: string;
  simulationPlan?: PositionSyncSimulationEvidence;
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
  simulationId?: string;
  simulationFingerprint?: string;
  simulationSourceGeneratedAt?: string;
  simulationPlan?: PositionSyncSimulationEvidence;
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
        ...(entry.simulationId
          ? {
              simulationId: entry.simulationId,
              simulationFingerprint: entry.simulationFingerprint,
              simulationSourceGeneratedAt: entry.simulationSourceGeneratedAt,
              simulationPlan: entry.simulationPlan,
            }
          : {}),
        approvedAt: entry.approvedAt,
        handedOffAt: entry.handedOffAt,
        completedManuallyAt: entry.completedManuallyAt,
      } satisfies PositionSyncWorkflowEntry,
    ]),
  );
}

interface BuildPositionSyncWorkflowUpdateInput {
  groupId: string;
  followerAccountId: string;
  currentEntry?: PositionSyncWorkflowEntry;
  nextStatus: PositionSyncWorkflowSaveInput["status"];
  timestamp?: string;
  note?: string;
  operatorName?: string;
  assignmentReason?: string;
  appendOperatorAssignment?: boolean;
}

export function buildPositionSyncWorkflowUpdate(
  input: BuildPositionSyncWorkflowUpdateInput,
): PositionSyncWorkflowSaveInput {
  const timestamp = input.timestamp;

  return {
    groupId: input.groupId,
    followerAccountId: input.followerAccountId,
    status: input.nextStatus,
    note: input.note ?? input.currentEntry?.note,
    operatorName: input.operatorName ?? input.currentEntry?.operatorName,
    operatorHistory: input.appendOperatorAssignment
      ? appendPositionSyncOperatorAssignment(
          input.currentEntry?.operatorHistory,
          input.operatorName ?? input.currentEntry?.operatorName,
          timestamp ?? new Date().toISOString(),
          input.assignmentReason,
        )
      : input.currentEntry?.operatorHistory,
    reviewedAt:
      input.nextStatus === "reviewed" && timestamp
        ? timestamp
        : input.currentEntry?.reviewedAt,
    simulatedAt:
      input.nextStatus === "simulated" && timestamp
        ? timestamp
        : input.currentEntry?.simulatedAt,
    simulationId: input.currentEntry?.simulationId,
    simulationFingerprint: input.currentEntry?.simulationFingerprint,
    simulationSourceGeneratedAt: input.currentEntry?.simulationSourceGeneratedAt,
    simulationPlan: input.currentEntry?.simulationPlan,
    approvedAt:
      input.nextStatus === "approved" && timestamp
        ? timestamp
        : input.currentEntry?.approvedAt,
    handedOffAt:
      input.nextStatus === "handed_off" && timestamp
        ? timestamp
        : input.currentEntry?.handedOffAt,
    completedManuallyAt:
      input.nextStatus === "completed_manually" && timestamp
        ? timestamp
        : input.currentEntry?.completedManuallyAt,
  };
}
