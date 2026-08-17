import { useState } from "react";

import type {
  DashboardPositionSyncReviewGroup,
} from "@/hooks/use-dashboard-position-sync-data";
import type { PositionSyncRepairCandidateEntry } from "@/lib/position-sync-queue";
import {
  buildPositionSyncWorkflowKey,
  buildPositionSyncWorkflowUpdate,
  type PositionSyncWorkflowSaveInput,
  type PositionSyncWorkflowState,
} from "@/lib/position-sync-workflow";

interface SavePositionSyncWorkflowMutationLike {
  mutate: (reviews: PositionSyncWorkflowSaveInput[]) => void;
  isPending: boolean;
}

interface UseDashboardPositionSyncWorkflowOptions {
  username?: string | null;
  positionSyncWorkflowState: PositionSyncWorkflowState;
  positionSyncReviewGroups: DashboardPositionSyncReviewGroup[];
  savePositionSyncWorkflowMutation: SavePositionSyncWorkflowMutationLike;
  onReviewedSave?: (count: number) => void;
  onSimulatedSave?: (count: number) => void;
}

export function useDashboardPositionSyncWorkflow(
  options: UseDashboardPositionSyncWorkflowOptions,
) {
  const [positionSyncReviewNotes, setPositionSyncReviewNotes] = useState<Record<string, string>>(
    {},
  );

  const handlePositionSyncReview = (groupId: string, followerAccountId: string) => {
    const workflowKey = buildPositionSyncWorkflowKey(groupId, followerAccountId);
    const trimmedNote = positionSyncReviewNotes[workflowKey]?.trim();
    const reviewedAt = new Date().toISOString();

    options.savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId,
        followerAccountId,
        currentEntry: options.positionSyncWorkflowState[workflowKey],
        nextStatus: "reviewed",
        timestamp: reviewedAt,
        note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : undefined,
      }),
    ]);

    options.onReviewedSave?.(1);
  };

  const handlePositionSyncSimulation = (groupId: string) => {
    const reviewGroup = options.positionSyncReviewGroups.find((group) => group.groupId === groupId);
    if (!reviewGroup) {
      return;
    }

    const simulatedAt = new Date().toISOString();
    const reviews = reviewGroup.followers.map((follower) => {
      const workflowKey = buildPositionSyncWorkflowKey(groupId, follower.followerAccountId);
      return buildPositionSyncWorkflowUpdate({
        groupId,
        followerAccountId: follower.followerAccountId,
        currentEntry: options.positionSyncWorkflowState[workflowKey],
        nextStatus: "simulated",
        timestamp: simulatedAt,
        note:
          positionSyncReviewNotes[workflowKey]?.trim() ||
          options.positionSyncWorkflowState[workflowKey]?.note,
      });
    });

    options.savePositionSyncWorkflowMutation.mutate(reviews);
    options.onSimulatedSave?.(reviews.length);
  };

  const handleRepairCandidateTakeOwnership = (
    entry: PositionSyncRepairCandidateEntry,
  ) => {
    const currentEntry = options.positionSyncWorkflowState[entry.key];
    const now = new Date().toISOString();

    options.savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        currentEntry,
        nextStatus: currentEntry?.status ?? "reviewed",
        timestamp: now,
        note: currentEntry?.note,
        operatorName: options.username ?? undefined,
        assignmentReason: currentEntry?.operatorName
          ? "Reassigned staged sync ownership"
          : "Claimed staged sync ownership",
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleRepairCandidateAdvance = (
    entry: PositionSyncRepairCandidateEntry,
  ) => {
    const currentEntry = options.positionSyncWorkflowState[entry.key];
    const now = new Date().toISOString();

    if (entry.workflowStatus === "not_started") {
      options.savePositionSyncWorkflowMutation.mutate([
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry,
          nextStatus: "reviewed",
          timestamp: now,
          note: currentEntry?.note,
        }),
      ]);
      return;
    }

    if (entry.workflowStatus === "reviewed") {
      options.savePositionSyncWorkflowMutation.mutate([
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry,
          nextStatus: "simulated",
          timestamp: now,
          note: currentEntry?.note,
        }),
      ]);
      return;
    }

    if (entry.workflowStatus === "simulated") {
      options.savePositionSyncWorkflowMutation.mutate([
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry,
          nextStatus: "approved",
          timestamp: now,
          note: currentEntry?.note,
        }),
      ]);
    }
  };

  return {
    positionSyncReviewNotes,
    setPositionSyncReviewNotes,
    handlePositionSyncReview,
    handlePositionSyncSimulation,
    handleRepairCandidateTakeOwnership,
    handleRepairCandidateAdvance,
  };
}
