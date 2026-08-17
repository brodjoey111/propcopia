import type { AccountRiskFollowUpItem } from "./account-risk";
import type { RithmicReadinessFollowUpItemView } from "./follow-up-operator";
import type { PositionSyncQueueEntry } from "./position-sync-queue";
import type { ExecutionRecoveryFollowUpItem } from "./runtime-overview";

export interface SharedRiskFollowUpItem extends AccountRiskFollowUpItem {
  review?: {
    status?: "pending" | "reviewed";
    operatorName?: string;
    operatorHistory?: Array<{
      operatorName: string;
      assignedAt: string;
      reason?: string;
    }>;
  };
}

export interface OperatorWorkSummary {
  total: number;
  open: number;
  overdue: number;
  unassigned: number;
  reassigned: number;
  laneCounts: {
    risk: number;
    execution: number;
    rithmicReadiness: number;
    sync: number;
  };
  headline: string;
  detail: string;
}

export function buildOperatorWorkSummary(input: {
  riskItems: SharedRiskFollowUpItem[];
  executionItems: ExecutionRecoveryFollowUpItem[];
  rithmicReadinessItems: RithmicReadinessFollowUpItemView[];
  syncItems: PositionSyncQueueEntry[];
}): OperatorWorkSummary {
  const riskOpen = input.riskItems.filter((item) => item.review?.status !== "reviewed");
  const executionOpen = input.executionItems.filter((item) => item.reviewStatus !== "reviewed");
  const rithmicReadinessOpen = input.rithmicReadinessItems.filter(
    (item) => item.review?.status !== "reviewed",
  );
  const syncOpen = input.syncItems.filter((item) => item.status !== "completed_manually");

  const overdue =
    riskOpen.filter((item) => item.status === "BREACHED" || item.status === "WARN").length +
    executionOpen.filter((item) => item.category === "failed" || item.category === "stale").length +
    rithmicReadinessOpen.length +
    syncOpen.filter((item) => item.needsAttention).length;

  const unassigned =
    riskOpen.filter((item) => !item.review?.operatorName).length +
    executionOpen.filter((item) => !item.operatorName).length +
    rithmicReadinessOpen.filter((item) => !item.review?.operatorName).length +
    syncOpen.filter((item) => !item.operatorName).length;

  const reassigned =
    input.riskItems.filter((item) => (item.review?.operatorHistory?.length ?? 0) > 1).length +
    input.executionItems.filter((item) => (item.operatorHistory?.length ?? 0) > 1).length +
    input.rithmicReadinessItems.filter((item) => (item.review?.operatorHistory?.length ?? 0) > 1).length +
    input.syncItems.filter((item) => item.reassignmentCount > 0).length;

  const open = riskOpen.length + executionOpen.length + rithmicReadinessOpen.length + syncOpen.length;
  const total =
    input.riskItems.length +
    input.executionItems.length +
    input.rithmicReadinessItems.length +
    input.syncItems.length;
  const laneCounts = {
    risk: riskOpen.length,
    execution: executionOpen.length,
    rithmicReadiness: rithmicReadinessOpen.length,
    sync: syncOpen.length,
  };

  return {
    total,
    open,
    overdue,
    unassigned,
    reassigned,
    laneCounts,
    headline:
      overdue > 0
        ? `${overdue} operator item${overdue === 1 ? "" : "s"} need urgent follow-up`
        : open > 0
          ? `${open} open operator item${open === 1 ? "" : "s"} in the shared queue`
          : "Shared operator queue is clear",
    detail:
      open > 0
        ? `${laneCounts.risk} risk, ${laneCounts.execution} execution, ${laneCounts.rithmicReadiness} Rithmic readiness, and ${laneCounts.sync} manual sync item${open === 1 ? "" : "s"} are still active.`
        : "No shared risk, execution, Rithmic readiness, or manual sync follow-up is waiting on the operator.",
  };
}
