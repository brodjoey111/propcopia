import {
  buildPositionSyncReview,
  buildPositionSyncSummaryCards,
  describePositionSyncOverview,
  sortPositionSyncGroups,
} from "@/lib/position-sync";
import {
  buildPositionSyncRepairCandidateQueue,
  summarizePositionSyncRepairCandidateQueue,
} from "@/lib/position-sync-queue";
import type { PositionSyncOverviewResponse } from "@/lib/runtime-overview";
import { usePositionSyncReviewData } from "@/hooks/use-position-sync-review-data";

export type DashboardPositionSyncPulse = ReturnType<typeof describePositionSyncOverview>;
export type DashboardPositionSyncCard = ReturnType<typeof buildPositionSyncSummaryCards>[number];
export type DashboardPositionSyncReviewGroup = ReturnType<typeof buildPositionSyncReview>[number];
export type DashboardPositionSyncOverviewGroup = PositionSyncOverviewResponse["groups"][number];

interface UseDashboardPositionSyncDataOptions {
  userId?: string | null;
  enabled?: boolean;
  selectedGroupId?: string | null;
  showPositionSyncDetail: boolean;
  usingMockData?: boolean;
  overview?: PositionSyncOverviewResponse | null;
  staleTime?: number;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
}

export function useDashboardPositionSyncData(
  options: UseDashboardPositionSyncDataOptions,
) {
  const {
    positionSyncPlansData,
    positionSyncWorkflowData,
    positionSyncWorkflowState,
    positionSyncRepairCandidates,
    positionSyncRepairBoardSummary,
    positionSyncRepairSummary,
  } = usePositionSyncReviewData({
    userId: options.userId,
    enabled:
      (options.enabled ?? !!options.userId) &&
      options.showPositionSyncDetail &&
      !options.usingMockData,
    groupId: options.selectedGroupId,
    staleTime: options.staleTime,
    refetchInterval: options.refetchInterval,
    refetchIntervalInBackground: options.refetchIntervalInBackground,
  });

  const positionSyncOverview = options.overview ?? null;
  const positionSyncDetailOverview = positionSyncPlansData ?? positionSyncOverview;
  const positionSyncPulse = describePositionSyncOverview(positionSyncOverview);
  const positionSyncCards = buildPositionSyncSummaryCards(positionSyncOverview);
  const positionSyncSummaryGroups = options.showPositionSyncDetail
    ? sortPositionSyncGroups(positionSyncOverview?.groups ?? [])
    : [];
  const positionSyncPlanGroups = options.showPositionSyncDetail
    ? sortPositionSyncGroups(positionSyncDetailOverview?.groups ?? [])
    : [];
  const positionSyncReviewGroups = options.showPositionSyncDetail
    ? buildPositionSyncReview(positionSyncDetailOverview?.groups ?? []).slice(0, 2)
    : [];
  const positionSyncRepairAttentionItems = buildPositionSyncRepairCandidateQueue(
    positionSyncOverview,
    positionSyncWorkflowData?.reviews ?? [],
  )
    .filter(
      (entry) =>
        entry.needsAttention ||
        (
          entry.workflowStatus !== "not_started" &&
          entry.workflowStatus !== "completed_manually" &&
          !entry.operatorName
        ),
    )
    .slice(0, 2);

  return {
    positionSyncPlansData,
    positionSyncWorkflowData,
    positionSyncWorkflowState,
    positionSyncDetailOverview,
    positionSyncPulse,
    positionSyncCards,
    positionSyncRepairCandidates,
    positionSyncRepairBoardSummary,
    positionSyncRepairSummary,
    positionSyncRepairAttentionItems,
    positionSyncSummaryGroups,
    positionSyncPlanGroups,
    positionSyncReviewGroups,
  };
}
