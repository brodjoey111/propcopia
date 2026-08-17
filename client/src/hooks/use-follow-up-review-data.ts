import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  ExecutionFollowUpReviewEntry,
  RithmicReadinessReviewEntry,
  RiskFollowUpReviewEntry,
} from "@/lib/follow-up-operator";
import { LIVE_QUERY_STALE_MS } from "@/lib/live-query-config";

function getReviewQueryKey(path: string, userId?: string | null) {
  return userId ? [path, userId] : [path, "anonymous"];
}

async function getReviewJson<T>(url: string): Promise<T | null> {
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

export function useFollowUpReviewData(userId?: string | null) {
  const riskFollowUpReviewQuery = useQuery<{
    success: boolean;
    reviews: RiskFollowUpReviewEntry[];
  } | null>({
    queryKey: getReviewQueryKey("/api/risk-follow-up/reviews", userId),
    queryFn: async ({ queryKey }) => getReviewJson(queryKey[0] as string),
    enabled: !!userId,
    staleTime: LIVE_QUERY_STALE_MS,
  });

  const executionFollowUpReviewQuery = useQuery<{
    success: boolean;
    reviews: ExecutionFollowUpReviewEntry[];
  } | null>({
    queryKey: getReviewQueryKey("/api/execution-follow-up/reviews", userId),
    queryFn: async ({ queryKey }) => getReviewJson(queryKey[0] as string),
    enabled: !!userId,
    staleTime: LIVE_QUERY_STALE_MS,
  });

  const rithmicReadinessReviewQuery = useQuery<{
    success: boolean;
    reviews: RithmicReadinessReviewEntry[];
  } | null>({
    queryKey: getReviewQueryKey("/api/rithmic-readiness/reviews", userId),
    queryFn: async ({ queryKey }) => getReviewJson(queryKey[0] as string),
    enabled: !!userId,
    staleTime: LIVE_QUERY_STALE_MS,
  });

  const riskReviewsByAccountId = useMemo(
    () =>
      new Map(
        (riskFollowUpReviewQuery.data?.reviews ?? []).map((review) => [review.accountId, review]),
      ),
    [riskFollowUpReviewQuery.data?.reviews],
  );

  const executionReviewsByHistoryId = useMemo(
    () =>
      new Map(
        (executionFollowUpReviewQuery.data?.reviews ?? []).map((review) => [review.historyId, review]),
      ),
    [executionFollowUpReviewQuery.data?.reviews],
  );

  const rithmicReadinessReviewsByStoryKey = useMemo(
    () =>
      new Map(
        (rithmicReadinessReviewQuery.data?.reviews ?? []).map((review) => [review.storyKey, review]),
      ),
    [rithmicReadinessReviewQuery.data?.reviews],
  );

  return {
    riskFollowUpReviewData: riskFollowUpReviewQuery.data,
    executionFollowUpReviewData: executionFollowUpReviewQuery.data,
    rithmicReadinessReviewData: rithmicReadinessReviewQuery.data,
    riskFollowUpReviewQuery,
    executionFollowUpReviewQuery,
    rithmicReadinessReviewQuery,
    riskReviewsByAccountId,
    executionReviewsByHistoryId,
    rithmicReadinessReviewsByStoryKey,
  };
}
