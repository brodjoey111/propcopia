import { useEffect, useState } from "react";

import { buildPositionSyncWorkflowUpdate, type PositionSyncWorkflowSaveInput, type PositionSyncWorkflowState } from "@/lib/position-sync-workflow";
import { filterPositionSyncQueue, type PositionSyncQueueEntry, type PositionSyncQueueFilter } from "@/lib/position-sync-queue";

export type QueueSort = "recent" | "age" | "owner" | "reassignments";
export type QueueAuditFocus = "all" | "overdue" | "unassigned" | "reassigned";
export type SyncQueueBoardView = "compact" | "detailed";

const ACTIVITY_QUEUE_SORT_STORAGE_KEY = "propcopia.activity.queueSort";
const ACTIVITY_QUEUE_AUDIT_FOCUS_STORAGE_KEY = "propcopia.activity.queueAuditFocus";

interface ActivitySyncReviewUser {
  id?: string | null;
  username?: string | null;
  activityQueueSort?: string | null;
  activityQueueAuditFocus?: string | null;
}

interface UseActivitySyncReviewBoardOptions {
  user?: ActivitySyncReviewUser | null;
  positionSyncQueue: PositionSyncQueueEntry[];
  positionSyncWorkflowState: PositionSyncWorkflowState;
  savePositionSyncWorkflow: (reviews: PositionSyncWorkflowSaveInput[]) => void;
  saveActivityPreferences: (settings: {
    activityQueueSort?: QueueSort;
    activityQueueAuditFocus?: QueueAuditFocus;
  }) => void;
}

export function loadStoredQueueSort(): QueueSort {
  if (typeof window === "undefined") {
    return "recent";
  }

  const stored = window.localStorage.getItem(ACTIVITY_QUEUE_SORT_STORAGE_KEY);
  return stored === "age" || stored === "owner" || stored === "reassignments"
    ? stored
    : "recent";
}

export function loadStoredQueueAuditFocus(): QueueAuditFocus {
  if (typeof window === "undefined") {
    return "all";
  }

  const stored = window.localStorage.getItem(ACTIVITY_QUEUE_AUDIT_FOCUS_STORAGE_KEY);
  return stored === "overdue" || stored === "unassigned" || stored === "reassigned"
    ? stored
    : "all";
}

export function normalizeQueueSort(value?: string | null): QueueSort {
  return value === "age" || value === "owner" || value === "reassignments"
    ? value
    : "recent";
}

export function normalizeQueueAuditFocus(value?: string | null): QueueAuditFocus {
  return value === "overdue" || value === "unassigned" || value === "reassigned"
    ? value
    : "all";
}

function getSyncQueueStatusPriority(entry: PositionSyncQueueEntry) {
  if (entry.status === "handed_off") {
    return 0;
  }
  if (entry.status === "approved") {
    return 1;
  }
  if (entry.status === "simulated") {
    return 2;
  }
  if (entry.status === "reviewed") {
    return 3;
  }
  return 4;
}

export function useActivitySyncReviewBoard(
  options: UseActivitySyncReviewBoardOptions,
) {
  const [queueFilter, setQueueFilter] = useState<PositionSyncQueueFilter>("all");
  const [queueSearch, setQueueSearch] = useState("");
  const [assignmentReasons, setAssignmentReasons] = useState<Record<string, string>>({});
  const [queueAuditFocus, setQueueAuditFocus] = useState<QueueAuditFocus>(loadStoredQueueAuditFocus);
  const [queueSort, setQueueSort] = useState<QueueSort>(loadStoredQueueSort);
  const [syncQueueBoardView, setSyncQueueBoardView] = useState<SyncQueueBoardView>("compact");
  const [activityPreferencesHydrated, setActivityPreferencesHydrated] = useState(false);

  useEffect(() => {
    if (!options.user?.id) {
      setActivityPreferencesHydrated(false);
      return;
    }

    setQueueSort(normalizeQueueSort(options.user.activityQueueSort));
    setQueueAuditFocus(normalizeQueueAuditFocus(options.user.activityQueueAuditFocus));
    setActivityPreferencesHydrated(true);
  }, [options.user?.activityQueueAuditFocus, options.user?.activityQueueSort, options.user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ACTIVITY_QUEUE_AUDIT_FOCUS_STORAGE_KEY, queueAuditFocus);
  }, [queueAuditFocus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ACTIVITY_QUEUE_SORT_STORAGE_KEY, queueSort);
  }, [queueSort]);

  useEffect(() => {
    if (!options.user?.id || !activityPreferencesHydrated) {
      return;
    }

    const persistedQueueSort = normalizeQueueSort(options.user.activityQueueSort);
    const persistedQueueAuditFocus = normalizeQueueAuditFocus(options.user.activityQueueAuditFocus);

    if (queueSort === persistedQueueSort && queueAuditFocus === persistedQueueAuditFocus) {
      return;
    }

    options.saveActivityPreferences({
      activityQueueSort: queueSort,
      activityQueueAuditFocus: queueAuditFocus,
    });
  }, [
    activityPreferencesHydrated,
    options.saveActivityPreferences,
    options.user?.activityQueueAuditFocus,
    options.user?.activityQueueSort,
    options.user?.id,
    queueAuditFocus,
    queueSort,
  ]);

  const filteredPositionSyncQueue = filterPositionSyncQueue(
    options.positionSyncQueue,
    queueFilter,
    queueSearch,
  );
  const auditFocusedQueue = filteredPositionSyncQueue.filter((entry) => {
    if (queueAuditFocus === "overdue") {
      return entry.needsAttention;
    }

    if (queueAuditFocus === "unassigned") {
      return (entry.status === "approved" || entry.status === "handed_off") && !entry.operatorName;
    }

    if (queueAuditFocus === "reassigned") {
      return entry.reassignmentCount > 0;
    }

    return true;
  });
  const sortedAuditFocusedQueue = [...auditFocusedQueue].sort((left, right) => {
    if (queueSort === "recent") {
      if (left.needsAttention !== right.needsAttention) {
        return left.needsAttention ? -1 : 1;
      }

      const statusPriorityDiff =
        getSyncQueueStatusPriority(left) - getSyncQueueStatusPriority(right);
      if (statusPriorityDiff !== 0) {
        return statusPriorityDiff;
      }

      if (left.complexityScore !== right.complexityScore) {
        return right.complexityScore - left.complexityScore;
      }
    }

    if (queueSort === "age") {
      if (left.complexityScore !== right.complexityScore) {
        return right.complexityScore - left.complexityScore;
      }
      return right.ageMinutes - left.ageMinutes;
    }

    if (queueSort === "owner") {
      const leftOwner = (left.operatorName ?? "zzzz-unassigned").toLowerCase();
      const rightOwner = (right.operatorName ?? "zzzz-unassigned").toLowerCase();
      const ownerDiff = leftOwner.localeCompare(rightOwner);
      if (ownerDiff !== 0) {
        return ownerDiff;
      }
    }

    if (queueSort === "reassignments") {
      const reassignDiff = right.reassignmentCount - left.reassignmentCount;
      if (reassignDiff !== 0) {
        return reassignDiff;
      }
    }

    if (left.complexityScore !== right.complexityScore) {
      return right.complexityScore - left.complexityScore;
    }

    return right.ageMinutes - left.ageMinutes;
  });

  const overdueSyncEntries = options.positionSyncQueue.filter((entry) => entry.needsAttention);
  const unassignedSyncEntries = options.positionSyncQueue.filter(
    (entry) =>
      (entry.status === "approved" || entry.status === "handed_off") &&
      !entry.operatorName,
  );
  const reassignedSyncEntries = options.positionSyncQueue.filter(
    (entry) => entry.reassignmentCount > 0,
  );

  const handleApproveSyncQueueEntry = (entry: PositionSyncQueueEntry) => {
    options.savePositionSyncWorkflow([
      buildPositionSyncWorkflowUpdate({
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        currentEntry: options.positionSyncWorkflowState[entry.key],
        nextStatus: "approved",
        timestamp: new Date().toISOString(),
        note: entry.note,
        operatorName: entry.operatorName,
      }),
    ]);
  };

  const handleHandOffSyncQueueEntry = (entry: PositionSyncQueueEntry) => {
    const handedOffAt = new Date().toISOString();
    const reason = assignmentReasons[entry.key]?.trim() || "Assigned for manual execution";
    options.savePositionSyncWorkflow([
      buildPositionSyncWorkflowUpdate({
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        currentEntry: options.positionSyncWorkflowState[entry.key],
        nextStatus: "handed_off",
        timestamp: handedOffAt,
        note: entry.note,
        operatorName: options.user?.username ?? undefined,
        assignmentReason: reason,
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleCompleteSyncQueueEntry = (entry: PositionSyncQueueEntry) => {
    const completedManuallyAt = new Date().toISOString();
    const reason = assignmentReasons[entry.key]?.trim() || "Completed manual follow-through";
    options.savePositionSyncWorkflow([
      buildPositionSyncWorkflowUpdate({
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        currentEntry: options.positionSyncWorkflowState[entry.key],
        nextStatus: "completed_manually",
        timestamp: completedManuallyAt,
        note: entry.note,
        operatorName: options.user?.username ?? entry.operatorName,
        assignmentReason: reason,
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleTakeOwnership = (entry: PositionSyncQueueEntry) => {
    const reason =
      assignmentReasons[entry.key]?.trim() ||
      (entry.operatorName ? "Reassigned ownership" : "Claimed unassigned follow-up");
    options.savePositionSyncWorkflow([
      buildPositionSyncWorkflowUpdate({
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        currentEntry: options.positionSyncWorkflowState[entry.key],
        nextStatus: entry.status,
        timestamp: new Date().toISOString(),
        note: entry.note,
        operatorName: options.user?.username ?? undefined,
        assignmentReason: reason,
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleSelectAuditFocus = (
    nextFocus: QueueAuditFocus,
    nextFilter: PositionSyncQueueFilter = "all",
  ) => {
    setQueueAuditFocus(nextFocus);
    setQueueFilter(nextFilter);
  };

  const handleOpenRepairCandidateInQueue = (entry: {
    key: string;
    groupId: string;
    followerAccountId: string;
    followerName: string;
    workflowStatus: PositionSyncWorkflowSaveInput["status"] | "not_started";
    note?: string;
  }) => {
    if (entry.workflowStatus === "not_started") {
      const reviewedAt = new Date().toISOString();
      const currentEntry = options.positionSyncWorkflowState[entry.key];

      options.savePositionSyncWorkflow([
        buildPositionSyncWorkflowUpdate({
          groupId: entry.groupId,
          followerAccountId: entry.followerAccountId,
          currentEntry,
          nextStatus: "reviewed",
          timestamp: reviewedAt,
          note: entry.note ?? currentEntry?.note,
        }),
      ]);
      setQueueFilter("reviewed");
    } else if (entry.workflowStatus !== "completed_manually") {
      setQueueFilter(entry.workflowStatus);
    } else {
      setQueueFilter("all");
    }

    setQueueAuditFocus("all");
    setQueueSearch(entry.followerName);
  };

  return {
    queueFilter,
    setQueueFilter,
    queueSearch,
    setQueueSearch,
    assignmentReasons,
    setAssignmentReasons,
    queueAuditFocus,
    setQueueAuditFocus,
    queueSort,
    setQueueSort,
    syncQueueBoardView,
    setSyncQueueBoardView,
    filteredPositionSyncQueue,
    sortedAuditFocusedQueue,
    overdueSyncEntries,
    unassignedSyncEntries,
    reassignedSyncEntries,
    handleApproveSyncQueueEntry,
    handleHandOffSyncQueueEntry,
    handleCompleteSyncQueueEntry,
    handleTakeOwnership,
    handleSelectAuditFocus,
    handleOpenRepairCandidateInQueue,
  };
}
