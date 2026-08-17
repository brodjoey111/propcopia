import { useState } from "react";

import type {
  DashboardPositionSyncReviewGroup,
} from "@/hooks/use-dashboard-position-sync-data";
import type { PositionSyncSimulationTarget } from "@/hooks/use-position-sync-workflow-actions";
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

interface SimulatePositionSyncMutationLike {
  mutate: (targets: PositionSyncSimulationTarget[]) => void;
  isPending: boolean;
}

interface UseDashboardPositionSyncWorkflowOptions {
  username?: string | null;
  positionSyncWorkflowState: PositionSyncWorkflowState;
  positionSyncReviewGroups: DashboardPositionSyncReviewGroup[];
  savePositionSyncWorkflowMutation: SavePositionSyncWorkflowMutationLike;
  simulatePositionSyncMutation: SimulatePositionSyncMutationLike;
  onReviewedSave?: (count: number) => void;
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

    const targets = reviewGroup.followers
      .filter((follower) => follower.status === "OUT_OF_SYNC")
      .map((follower) => ({
        groupId,
        followerAccountId: follower.followerAccountId,
      }));

    if (targets.length > 0) {
      options.simulatePositionSyncMutation.mutate(targets);
    }
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
      options.simulatePositionSyncMutation.mutate([
        {
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
        },
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
