import { useState } from "react";

import { filterPositionSyncRepairCandidateQueue, type PositionSyncRepairCandidateEntry, type PositionSyncRepairCandidateFilter } from "@/lib/position-sync-queue";
import { buildPositionSyncWorkflowUpdate, type PositionSyncWorkflowState } from "@/lib/position-sync-workflow";

interface ActivitySyncRepairUser {
  username?: string | null;
}

interface UseActivitySyncRepairBoardOptions {
  user?: ActivitySyncRepairUser | null;
  positionSyncRepairCandidates: PositionSyncRepairCandidateEntry[];
  positionSyncWorkflowState: PositionSyncWorkflowState;
  savePositionSyncWorkflow: (
    reviews: ReturnType<typeof buildPositionSyncWorkflowUpdate>[],
  ) => void;
}

export function useActivitySyncRepairBoard(
  options: UseActivitySyncRepairBoardOptions,
) {
  const [repairCandidateFilter, setRepairCandidateFilter] =
    useState<PositionSyncRepairCandidateFilter>("all");
  const [repairCandidateSearch, setRepairCandidateSearch] = useState("");
  const [selectedRepairCandidateKeys, setSelectedRepairCandidateKeys] = useState<string[]>([]);
  const [repairCandidateNotes, setRepairCandidateNotes] = useState<Record<string, string>>({});

  const filteredRepairCandidates = filterPositionSyncRepairCandidateQueue(
    options.positionSyncRepairCandidates,
    repairCandidateFilter,
    repairCandidateSearch,
  );

  const handleToggleRepairCandidateSelection = (key: string) => {
    setSelectedRepairCandidateKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const handleSelectAllVisibleRepairCandidates = () => {
    setSelectedRepairCandidateKeys(filteredRepairCandidates.map((entry) => entry.key));
  };

  const handleSelectAutoReadyRepairCandidates = () => {
    setSelectedRepairCandidateKeys(
      filteredRepairCandidates
        .filter(
          (entry) =>
            entry.recommendation === "auto_ready" &&
            entry.complexity === "low" &&
            (entry.workflowStatus === "not_started" || entry.workflowStatus === "reviewed"),
        )
        .map((entry) => entry.key),
    );
  };

  const handleClearRepairCandidateSelection = () => {
    setSelectedRepairCandidateKeys([]);
  };

  const handleBulkReviewRepairCandidates = () => {
    if (selectedRepairCandidateKeys.length === 0) {
      return;
    }

    const reviewedAt = new Date().toISOString();
    const selectedEntries = filteredRepairCandidates.filter((entry) =>
      selectedRepairCandidateKeys.includes(entry.key),
    );

    options.savePositionSyncWorkflow(
      selectedEntries.map((entry) =>
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry: options.positionSyncWorkflowState[entry.key],
          nextStatus: "reviewed",
          timestamp: reviewedAt,
        }),
      ),
    );
    setSelectedRepairCandidateKeys([]);
  };

  const handleBulkSimulateRepairCandidates = () => {
    if (selectedRepairCandidateKeys.length === 0) {
      return;
    }

    const simulatedAt = new Date().toISOString();
    const selectedEntries = filteredRepairCandidates.filter((entry) =>
      selectedRepairCandidateKeys.includes(entry.key),
    );

    options.savePositionSyncWorkflow(
      selectedEntries.map((entry) =>
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry: options.positionSyncWorkflowState[entry.key],
          nextStatus: "simulated",
          timestamp: simulatedAt,
        }),
      ),
    );
    setSelectedRepairCandidateKeys([]);
  };

  const handleBulkTakeRepairCandidateOwnership = () => {
    if (!options.user?.username || selectedRepairCandidateKeys.length === 0) {
      return;
    }

    const assignedAt = new Date().toISOString();
    const selectedEntries = filteredRepairCandidates.filter((entry) =>
      selectedRepairCandidateKeys.includes(entry.key),
    );

    options.savePositionSyncWorkflow(
      selectedEntries.map((entry) => {
        const currentEntry = options.positionSyncWorkflowState[entry.key];
        const reason =
          repairCandidateNotes[entry.key]?.trim() ||
          (currentEntry?.operatorName
            ? "Reassigned staged sync repair ownership"
            : "Claimed staged sync repair ownership");

        return buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry,
          nextStatus: currentEntry?.status ?? "reviewed",
          timestamp: assignedAt,
          note: repairCandidateNotes[entry.key]?.trim() || currentEntry?.note,
          operatorName: options.user?.username ?? undefined,
          assignmentReason: reason,
          appendOperatorAssignment: true,
        });
      }),
    );
    setSelectedRepairCandidateKeys([]);
  };

  const handleBulkApproveRepairCandidates = () => {
    if (selectedRepairCandidateKeys.length === 0) {
      return;
    }

    const approvedAt = new Date().toISOString();
    const selectedEntries = filteredRepairCandidates.filter((entry) =>
      selectedRepairCandidateKeys.includes(entry.key),
    );

    options.savePositionSyncWorkflow(
      selectedEntries.map((entry) =>
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry: options.positionSyncWorkflowState[entry.key],
          nextStatus: "approved",
          timestamp: approvedAt,
          note:
            repairCandidateNotes[entry.key]?.trim() ||
            options.positionSyncWorkflowState[entry.key]?.note,
        }),
      ),
    );
    setSelectedRepairCandidateKeys([]);
  };

  const handleSaveRepairCandidateNote = (entry: PositionSyncRepairCandidateEntry) => {
    const currentEntry = options.positionSyncWorkflowState[entry.key];

    options.savePositionSyncWorkflow([
      buildPositionSyncWorkflowUpdate({
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        currentEntry,
        nextStatus: currentEntry?.status ?? "reviewed",
        note: repairCandidateNotes[entry.key]?.trim() || undefined,
      }),
    ]);
  };

  return {
    repairCandidateFilter,
    setRepairCandidateFilter,
    repairCandidateSearch,
    setRepairCandidateSearch,
    selectedRepairCandidateKeys,
    repairCandidateNotes,
    setRepairCandidateNotes,
    filteredRepairCandidates,
    handleToggleRepairCandidateSelection,
    handleSelectAllVisibleRepairCandidates,
    handleSelectAutoReadyRepairCandidates,
    handleClearRepairCandidateSelection,
    handleBulkReviewRepairCandidates,
    handleBulkSimulateRepairCandidates,
    handleBulkTakeRepairCandidateOwnership,
    handleBulkApproveRepairCandidates,
    handleSaveRepairCandidateNote,
  };
}
