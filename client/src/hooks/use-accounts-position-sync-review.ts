import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  buildPositionSyncWorkflowKey,
  buildPositionSyncWorkflowUpdate,
  type PositionSyncWorkflowEntry,
  type PositionSyncWorkflowSaveInput,
  type PositionSyncWorkflowState,
} from "@/lib/position-sync-workflow";

interface PositionSyncActionInput {
  groupId: string;
  followerAccountId: string;
  workflowKey: string;
  workflowEntry?: PositionSyncWorkflowEntry;
}

interface UseAccountsPositionSyncReviewOptions {
  userId?: string | null;
  username?: string | null;
  positionSyncWorkflowState: PositionSyncWorkflowState;
  onWorkflowSaved?: () => void;
  onWorkflowSaveSuccess?: (count: number) => void;
}

export function useAccountsPositionSyncReview(
  options: UseAccountsPositionSyncReviewOptions,
) {
  const [positionSyncReviewNotes, setPositionSyncReviewNotes] = useState<Record<string, string>>(
    {},
  );
  const [positionSyncAssignmentReasons, setPositionSyncAssignmentReasons] = useState<
    Record<string, string>
  >({});

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
      queryClient.setQueryData(
        options.userId
          ? ["/api/position-sync/reviews", options.userId]
          : ["/api/position-sync/reviews", "anonymous"],
        result,
      );
      options.onWorkflowSaved?.();

      setPositionSyncReviewNotes((current) => {
        const next = { ...current };
        for (const review of reviews) {
          delete next[buildPositionSyncWorkflowKey(review.groupId, review.followerAccountId)];
        }
        return next;
      });

      options.onWorkflowSaveSuccess?.(reviews.length);
    },
  });

  const handleApprovePositionSyncEntry = (input: PositionSyncActionInput) => {
    savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId: input.groupId,
        followerAccountId: input.followerAccountId,
        currentEntry: input.workflowEntry,
        nextStatus: "approved",
        timestamp: new Date().toISOString(),
        note:
          positionSyncReviewNotes[input.workflowKey]?.trim() || input.workflowEntry?.note,
      }),
    ]);
  };

  const handleTakePositionSyncOwnership = (input: PositionSyncActionInput) => {
    savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId: input.groupId,
        followerAccountId: input.followerAccountId,
        currentEntry: input.workflowEntry ?? options.positionSyncWorkflowState[input.workflowKey],
        nextStatus: input.workflowEntry?.status ?? "reviewed",
        note:
          positionSyncReviewNotes[input.workflowKey]?.trim() || input.workflowEntry?.note,
        operatorName: options.username ?? undefined,
        assignmentReason:
          positionSyncAssignmentReasons[input.workflowKey]?.trim() ||
          (input.workflowEntry?.operatorName
            ? "Reassigned ownership"
            : "Claimed sync follow-up"),
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleHandOffPositionSyncEntry = (input: PositionSyncActionInput) => {
    savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId: input.groupId,
        followerAccountId: input.followerAccountId,
        currentEntry: input.workflowEntry ?? options.positionSyncWorkflowState[input.workflowKey],
        nextStatus: "handed_off",
        timestamp: new Date().toISOString(),
        note:
          positionSyncReviewNotes[input.workflowKey]?.trim() || input.workflowEntry?.note,
        operatorName: options.username ?? input.workflowEntry?.operatorName,
        assignmentReason:
          positionSyncAssignmentReasons[input.workflowKey]?.trim() ||
          "Assigned for manual execution",
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleCompletePositionSyncEntry = (input: PositionSyncActionInput) => {
    savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId: input.groupId,
        followerAccountId: input.followerAccountId,
        currentEntry: input.workflowEntry ?? options.positionSyncWorkflowState[input.workflowKey],
        nextStatus: "completed_manually",
        timestamp: new Date().toISOString(),
        note:
          positionSyncReviewNotes[input.workflowKey]?.trim() || input.workflowEntry?.note,
        operatorName: options.username ?? input.workflowEntry?.operatorName,
        assignmentReason:
          positionSyncAssignmentReasons[input.workflowKey]?.trim() ||
          "Completed manual follow-through",
        appendOperatorAssignment: true,
      }),
    ]);
  };

  return {
    positionSyncReviewNotes,
    setPositionSyncReviewNotes,
    positionSyncAssignmentReasons,
    setPositionSyncAssignmentReasons,
    savePositionSyncWorkflowMutation,
    handleApprovePositionSyncEntry,
    handleTakePositionSyncOwnership,
    handleHandOffPositionSyncEntry,
    handleCompletePositionSyncEntry,
  };
}
