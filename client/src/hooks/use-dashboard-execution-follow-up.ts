import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  buildExecutionFollowUpReviewPayload,
  type ExecutionFollowUpReviewEntry,
} from "@/lib/follow-up-operator";
import { apiRequest } from "@/lib/queryClient";
import type { ExecutionRecoveryFollowUpItem } from "@/lib/runtime-overview";

interface RecheckExecutionRecoveryItemResult {
  success: boolean;
  recoveryItem?: {
    symbol: string;
    headline: string;
  } | null;
}

interface SaveExecutionFollowUpReviewsResult {
  success: boolean;
  reviews: ExecutionFollowUpReviewEntry[];
}

interface SaveExecutionFollowUpReviewsMutationLike {
  mutate: (reviews: ExecutionFollowUpReviewEntry[]) => void;
  mutateAsync: (
    reviews: ExecutionFollowUpReviewEntry[],
  ) => Promise<SaveExecutionFollowUpReviewsResult>;
  isPending: boolean;
}

interface RecheckExecutionRecoveryItemMutationLike {
  mutateAsync: (historyId: string) => Promise<RecheckExecutionRecoveryItemResult>;
  isPending: boolean;
}

interface UseDashboardExecutionFollowUpOptions {
  username?: string | null;
  refreshDashboardRuntimeOverview: () => void;
  saveExecutionFollowUpReviewsMutation: SaveExecutionFollowUpReviewsMutationLike;
  recheckExecutionRecoveryItemMutation: RecheckExecutionRecoveryItemMutationLike;
  onRecheckSuccess?: () => void;
  onRecheckError?: (error: unknown) => void;
  onItemRecheckSuccess?: (result: RecheckExecutionRecoveryItemResult) => void;
  onItemRecheckError?: (error: unknown) => void;
  onReviewSuccess?: () => void;
  onReviewError?: (error: unknown) => void;
}

function toCurrentReview(item: ExecutionRecoveryFollowUpItem) {
  return {
    historyId: item.historyId,
    status: item.reviewStatus ?? "pending",
    note: item.reviewNote,
    operatorName: item.operatorName,
    operatorHistory: item.operatorHistory,
    reviewedAt: item.reviewedAt,
  };
}

export function useDashboardExecutionFollowUp(
  options: UseDashboardExecutionFollowUpOptions,
) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const recheckExecutionRecoveryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/runtime/dashboard-overview/recheck");
      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      options.refreshDashboardRuntimeOverview();
      options.onRecheckSuccess?.();
    },
    onError: (error) => {
      options.onRecheckError?.(error);
    },
  });

  const handleExecutionRecoveryRecheck = async () => {
    await recheckExecutionRecoveryMutation.mutateAsync();
  };

  const handleExecutionRecoveryItemRecheck = async (historyId: string) => {
    try {
      const result = await options.recheckExecutionRecoveryItemMutation.mutateAsync(historyId);
      options.onItemRecheckSuccess?.(result);
      return result;
    } catch (error) {
      options.onItemRecheckError?.(error);
      throw error;
    }
  };

  const handleExecutionRecoveryItemReview = async (
    item: ExecutionRecoveryFollowUpItem,
  ) => {
    const note = reviewNotes[item.historyId]?.trim();
    const reviewedAt = new Date().toISOString();
    try {
      await options.saveExecutionFollowUpReviewsMutation.mutateAsync([
        buildExecutionFollowUpReviewPayload({
          historyId: item.historyId,
          currentReview: toCurrentReview(item),
          operatorName: item.operatorName ?? options.username ?? undefined,
          note: note && note.length > 0 ? note : item.reviewNote,
          status: "reviewed",
          reviewedAt,
          assignmentReason: "Reviewed execution follow-up item",
        }),
      ]);
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[item.historyId];
        return next;
      });
      options.onReviewSuccess?.();
    } catch (error) {
      options.onReviewError?.(error);
      throw error;
    }
  };

  const handleExecutionRecoveryItemTakeOwnership = (
    item: ExecutionRecoveryFollowUpItem,
  ) => {
    options.saveExecutionFollowUpReviewsMutation.mutate([
      buildExecutionFollowUpReviewPayload({
        historyId: item.historyId,
        currentReview: toCurrentReview(item),
        note: reviewNotes[item.historyId]?.trim() || item.reviewNote,
        operatorName: options.username ?? undefined,
        status: item.reviewStatus ?? "pending",
        reviewedAt: item.reviewedAt,
        assignmentReason: item.operatorName
          ? "Reassigned execution follow-up ownership"
          : "Claimed execution follow-up",
      }),
    ]);
  };

  const handleExecutionRecoveryItemSaveNote = (
    item: ExecutionRecoveryFollowUpItem,
  ) => {
    options.saveExecutionFollowUpReviewsMutation.mutate([
      buildExecutionFollowUpReviewPayload({
        historyId: item.historyId,
        currentReview: toCurrentReview(item),
        note: reviewNotes[item.historyId]?.trim() || undefined,
        operatorName: item.operatorName ?? options.username ?? undefined,
        status: item.reviewStatus ?? "pending",
        reviewedAt: item.reviewedAt,
      }),
    ]);
  };

  const handleExecutionRecoveryItemReopen = (
    item: ExecutionRecoveryFollowUpItem,
  ) => {
    const now = new Date().toISOString();
    options.saveExecutionFollowUpReviewsMutation.mutate([
      buildExecutionFollowUpReviewPayload({
        historyId: item.historyId,
        currentReview: toCurrentReview(item),
        note: reviewNotes[item.historyId]?.trim() || item.reviewNote,
        operatorName: item.operatorName ?? options.username ?? undefined,
        status: "pending",
        reviewedAt: now,
        assignmentReason: "Reopened execution follow-up item",
      }),
    ]);
  };

  return {
    reviewNotes,
    setReviewNotes,
    recheckExecutionRecoveryMutation,
    handleExecutionRecoveryRecheck,
    handleExecutionRecoveryItemRecheck,
    handleExecutionRecoveryItemReview,
    handleExecutionRecoveryItemTakeOwnership,
    handleExecutionRecoveryItemSaveNote,
    handleExecutionRecoveryItemReopen,
  };
}
