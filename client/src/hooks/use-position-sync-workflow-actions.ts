import { useMutation } from "@tanstack/react-query";

import { notificationsQueryKey } from "@/hooks/use-notifications";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PositionSyncWorkflowSaveInput } from "@/lib/position-sync-workflow";

interface UsePositionSyncWorkflowActionsOptions {
  userId?: string | null;
  onSuccess?: (
    result: {
      success: boolean;
      reviews: PositionSyncWorkflowSaveInput[];
    },
    reviews: PositionSyncWorkflowSaveInput[],
  ) => void;
}

function getPositionSyncWorkflowQueryKey(userId?: string | null) {
  return userId
    ? ["/api/position-sync/reviews", userId]
    : ["/api/position-sync/reviews", "anonymous"];
}

export function usePositionSyncWorkflowActions(
  options: UsePositionSyncWorkflowActionsOptions,
) {
  const savePositionSyncWorkflowMutation = useMutation({
    mutationFn: async (reviews: PositionSyncWorkflowSaveInput[]) => {
      const response = await apiRequest("POST", "/api/position-sync/reviews", {
        reviews,
      });
      return response.json() as Promise<{
        success: boolean;
        reviews: PositionSyncWorkflowSaveInput[];
      }>;
    },
    onSuccess: (result, reviews) => {
      queryClient.setQueryData(getPositionSyncWorkflowQueryKey(options.userId), result);
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      options.onSuccess?.(result, reviews);
    },
  });

  return {
    savePositionSyncWorkflowMutation,
  };
}
