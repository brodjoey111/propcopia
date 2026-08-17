import { useMutation } from "@tanstack/react-query";

import { notificationsQueryKey } from "@/hooks/use-notifications";
import { revalidateRithmicReadiness } from "@/lib/account-connection-api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  ExecutionFollowUpReviewEntry,
  RithmicReadinessReviewEntry,
  RiskFollowUpReviewEntry,
} from "@/lib/follow-up-operator";
import type { RithmicAccountReadiness } from "@/lib/rithmic-readiness";

interface UseFollowUpReviewActionsOptions {
  userId?: string | null;
  onRiskSuccess?: () => void;
  onExecutionSuccess?: () => void;
}

function getRiskReviewQueryKey(userId?: string | null) {
  return userId
    ? ["/api/risk-follow-up/reviews", userId]
    : ["/api/risk-follow-up/reviews", "anonymous"];
}

function getExecutionReviewQueryKey(userId?: string | null) {
  return userId
    ? ["/api/execution-follow-up/reviews", userId]
    : ["/api/execution-follow-up/reviews", "anonymous"];
}

function getRithmicReadinessReviewQueryKey(userId?: string | null) {
  return userId
    ? ["/api/rithmic-readiness/reviews", userId]
    : ["/api/rithmic-readiness/reviews", "anonymous"];
}

export function useFollowUpReviewActions(options: UseFollowUpReviewActionsOptions) {
  const saveRiskFollowUpReviewsMutation = useMutation({
    mutationFn: async (reviews: RiskFollowUpReviewEntry[]) => {
      const response = await apiRequest("POST", "/api/risk-follow-up/reviews", {
        reviews,
      });
      return response.json() as Promise<{
        success: boolean;
        reviews: RiskFollowUpReviewEntry[];
      }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(getRiskReviewQueryKey(options.userId), result);
      options.onRiskSuccess?.();
    },
  });

  const saveExecutionFollowUpReviewsMutation = useMutation({
    mutationFn: async (reviews: ExecutionFollowUpReviewEntry[]) => {
      const response = await apiRequest("POST", "/api/execution-follow-up/reviews", {
        reviews,
      });
      return response.json() as Promise<{
        success: boolean;
        reviews: ExecutionFollowUpReviewEntry[];
      }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(getExecutionReviewQueryKey(options.userId), result);
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      options.onExecutionSuccess?.();
    },
  });

  const saveRithmicReadinessReviewsMutation = useMutation({
    mutationFn: async (reviews: RithmicReadinessReviewEntry[]) => {
      const response = await apiRequest("POST", "/api/rithmic-readiness/reviews", {
        reviews,
      });
      return response.json() as Promise<{
        success: boolean;
        reviews: RithmicReadinessReviewEntry[];
      }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(getRithmicReadinessReviewQueryKey(options.userId), result);
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  const recheckExecutionFollowUpItemMutation = useMutation({
    mutationFn: async (historyId: string) => {
      const response = await apiRequest("POST", `/api/runtime/dashboard-overview/recheck/${historyId}`);
      return response.json() as Promise<{
        success: boolean;
        historyId: string;
        recoveryItem?: {
          symbol: string;
          headline: string;
        } | null;
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  const recheckRithmicReadinessMutation = useMutation({
    mutationFn: async (accountId: string) =>
      revalidateRithmicReadiness(accountId) as Promise<{
        success: boolean;
        message: string;
        readiness: RithmicAccountReadiness;
      }>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/rithmic-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  return {
    saveRiskFollowUpReviewsMutation,
    saveExecutionFollowUpReviewsMutation,
    saveRithmicReadinessReviewsMutation,
    recheckExecutionFollowUpItemMutation,
    recheckRithmicReadinessMutation,
  };
}
