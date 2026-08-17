import { useMutation } from "@tanstack/react-query";

import { notificationsQueryKey } from "@/hooks/use-notifications";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  PositionSyncSimulationEvidence,
  PositionSyncWorkflowSaveInput,
} from "@/lib/position-sync-workflow";

export interface PositionSyncSimulationTarget {
  groupId: string;
  followerAccountId: string;
}

interface UsePositionSyncWorkflowActionsOptions {
  userId?: string | null;
  onSuccess?: (
    result: {
      success: boolean;
      reviews: PositionSyncWorkflowSaveInput[];
    },
    reviews: PositionSyncWorkflowSaveInput[],
  ) => void;
  onSimulationSuccess?: (
    result: {
      success: true;
      simulations: PositionSyncSimulationEvidence[];
      reviews: PositionSyncWorkflowSaveInput[];
    },
    targets: PositionSyncSimulationTarget[],
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

  const simulatePositionSyncMutation = useMutation({
    mutationFn: async (targets: PositionSyncSimulationTarget[]) => {
      const results: Array<{
        success: true;
        simulation: PositionSyncSimulationEvidence;
        reviews: PositionSyncWorkflowSaveInput[];
      }> = [];

      for (const target of targets) {
        const response = await apiRequest("POST", "/api/position-sync/simulations", target);
        results.push(await response.json());
      }

      return {
        success: true as const,
        simulations: results.map((result) => result.simulation),
        reviews: results.at(-1)?.reviews ?? [],
      };
    },
    onSuccess: (result, targets) => {
      queryClient.setQueryData(getPositionSyncWorkflowQueryKey(options.userId), {
        success: true,
        reviews: result.reviews,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      options.onSimulationSuccess?.(result, targets);
    },
  });

  return {
    savePositionSyncWorkflowMutation,
    simulatePositionSyncMutation,
  };
}
