import { useQuery } from "@tanstack/react-query";

import {
  buildPositionSyncRepairCandidateQueue,
  summarizePositionSyncRepairCandidateQueue,
} from "@/lib/position-sync-queue";
import { summarizePositionSyncRepairOpportunities } from "@/lib/position-sync";
import {
  toPositionSyncWorkflowState,
  type PositionSyncWorkflowSaveInput,
} from "@/lib/position-sync-workflow";
import { LIVE_QUERY_STALE_MS } from "@/lib/live-query-config";
import type { PositionSyncOverviewResponse } from "@/lib/runtime-overview";

interface UsePositionSyncReviewDataOptions {
  userId?: string | null;
  enabled?: boolean;
  groupId?: string | null;
  staleTime?: number;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
}

async function loadPositionSyncResource<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (response.status === 401 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

export function usePositionSyncReviewData(
  options: UsePositionSyncReviewDataOptions,
) {
  const enabled = options.enabled ?? !!options.userId;
  const staleTime = options.staleTime ?? LIVE_QUERY_STALE_MS;
  const groupScope = options.groupId ?? "all";

  const { data: positionSyncPlansData } = useQuery<PositionSyncOverviewResponse | null>({
    queryKey: options.userId
      ? ["/api/position-sync/plans", options.userId, groupScope]
      : ["/api/position-sync/plans", "anonymous", groupScope],
    queryFn: async ({ queryKey }) => {
      const selectedGroupId = queryKey[2];
      const url =
        typeof selectedGroupId === "string" && selectedGroupId !== "all"
          ? `/api/position-sync/plans?groupId=${encodeURIComponent(selectedGroupId)}`
          : (queryKey[0] as string);

      return loadPositionSyncResource<PositionSyncOverviewResponse>(url);
    },
    enabled,
    staleTime,
    refetchInterval: options.refetchInterval,
    refetchIntervalInBackground: options.refetchIntervalInBackground,
  });

  const { data: positionSyncWorkflowData } = useQuery<{
    success: boolean;
    reviews: PositionSyncWorkflowSaveInput[];
  } | null>({
    queryKey: options.userId
      ? ["/api/position-sync/reviews", options.userId]
      : ["/api/position-sync/reviews", "anonymous"],
    queryFn: async ({ queryKey }) =>
      loadPositionSyncResource<{
        success: boolean;
        reviews: PositionSyncWorkflowSaveInput[];
      }>(queryKey[0] as string),
    enabled,
    staleTime,
    refetchInterval: options.refetchInterval,
    refetchIntervalInBackground: options.refetchIntervalInBackground,
  });

  const positionSyncWorkflowState = positionSyncWorkflowData?.reviews
    ? toPositionSyncWorkflowState(positionSyncWorkflowData.reviews)
    : {};
  const positionSyncRepairCandidates = buildPositionSyncRepairCandidateQueue(
    positionSyncPlansData,
    positionSyncWorkflowData?.reviews ?? [],
  );
  const positionSyncRepairBoardSummary = summarizePositionSyncRepairCandidateQueue(
    positionSyncRepairCandidates,
  );
  const positionSyncRepairSummary = summarizePositionSyncRepairOpportunities(
    positionSyncPlansData,
  );

  return {
    positionSyncPlansData,
    positionSyncWorkflowData,
    positionSyncWorkflowState,
    positionSyncRepairCandidates,
    positionSyncRepairBoardSummary,
    positionSyncRepairSummary,
  };
}
