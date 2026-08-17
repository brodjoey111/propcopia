import { useEffect, useState } from "react";
import type {
  CopyGroupHealthWatchlistEntry,
  CopyGroupHealthWatchlistSummary,
} from "@/lib/copy-groups";

export type CopyGroupHealthReviewFilter =
  | "all"
  | "unreviewed"
  | "reviewed"
  | "stale"
  | "recurring";
export type CopyGroupHealthRecoveryFilter =
  | "all"
  | "recover_now"
  | "stabilize_soon"
  | "resume_check"
  | "stage_before_use";
export type CopyGroupHealthBoardView = "compact" | "detailed";

export interface CopyGroupHealthReviewState {
  acknowledgedAt: string;
  note: string;
  concernSignature?: string;
  reviewedBy?: string;
  history?: Array<{
    acknowledgedAt: string;
    note: string;
    reviewedBy?: string;
    concernSignature?: string;
  }>;
}

export interface CopyGroupHealthBulkResultSummary {
  action: "acknowledged" | "cleared";
  count: number;
  groupNames: string[];
  recordedAt: string;
}

interface CopyGroupHealthUser {
  id?: string | null;
  username?: string | null;
  copyGroupHealthReviewFilter?: string | null;
  copyGroupHealthReviewsJson?: string | null;
}

interface UseActivityCopyGroupHealthBoardOptions {
  user?: CopyGroupHealthUser | null;
  copyGroupHealthWatchlist: CopyGroupHealthWatchlistSummary;
  saveActivityPreferences: (settings: {
    copyGroupHealthReviewFilter?: CopyGroupHealthReviewFilter;
    copyGroupHealthReviewsJson?: string | null;
  }) => void;
}

const COPY_GROUP_HEALTH_REVIEW_STORAGE_KEY = "propcopia.activity.copyGroupHealthReviews";
const COPY_GROUP_HEALTH_BOARD_VIEW_STORAGE_KEY = "propcopia.activity.copyGroupHealthBoardView";

export function loadCopyGroupHealthReviews(): Record<string, CopyGroupHealthReviewState> {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(COPY_GROUP_HEALTH_REVIEW_STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as Record<string, CopyGroupHealthReviewState>;
  } catch {
    return {};
  }
}

export function loadStoredCopyGroupHealthBoardView(): CopyGroupHealthBoardView {
  if (typeof window === "undefined") {
    return "compact";
  }

  const stored = window.localStorage.getItem(COPY_GROUP_HEALTH_BOARD_VIEW_STORAGE_KEY);
  return stored === "detailed" ? "detailed" : "compact";
}

export function normalizeCopyGroupHealthBoardView(
  value?: string | null,
): CopyGroupHealthBoardView {
  return value === "detailed" ? "detailed" : "compact";
}

export function normalizeCopyGroupHealthReviewFilter(
  value?: string | null,
): CopyGroupHealthReviewFilter {
  return value === "unreviewed" ||
    value === "reviewed" ||
    value === "stale" ||
    value === "recurring"
    ? value
    : "all";
}

export function parseCopyGroupHealthReviewsJson(
  value?: string | null,
): Record<string, CopyGroupHealthReviewState> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, CopyGroupHealthReviewState>;
  } catch {
    return {};
  }
}

export function buildCopyGroupHealthConcernSignature(entry: {
  groupId: string;
  status: string;
  healthStatus: string;
  concernLabel: string;
  detail: string;
  latestRecoveryActionAt?: string;
}): string {
  return [
    entry.groupId,
    entry.status,
    entry.healthStatus,
    entry.concernLabel,
    entry.detail,
    entry.latestRecoveryActionAt ?? "no-recovery-action",
  ].join("|");
}

export function countRecentMatchingHealthReviews(
  review: CopyGroupHealthReviewState | undefined,
  concernSignature: string,
  now = new Date(),
): number {
  if (!review?.history?.length) {
    return 0;
  }

  const windowStart = now.getTime() - 24 * 60 * 60 * 1000;
  return review.history.filter((entry) => {
    if (entry.concernSignature !== concernSignature) {
      return false;
    }

    const acknowledgedAt = new Date(entry.acknowledgedAt).getTime();
    return Number.isFinite(acknowledgedAt) && acknowledgedAt >= windowStart;
  }).length;
}

export function useActivityCopyGroupHealthBoard(
  options: UseActivityCopyGroupHealthBoardOptions,
) {
  const [copyGroupHealthReviews, setCopyGroupHealthReviews] = useState<
    Record<string, CopyGroupHealthReviewState>
  >(loadCopyGroupHealthReviews);
  const [copyGroupHealthNotes, setCopyGroupHealthNotes] = useState<Record<string, string>>({});
  const [copyGroupHealthReviewFilter, setCopyGroupHealthReviewFilter] =
    useState<CopyGroupHealthReviewFilter>("all");
  const [copyGroupHealthRecoveryFilter, setCopyGroupHealthRecoveryFilter] =
    useState<CopyGroupHealthRecoveryFilter>("all");
  const [copyGroupHealthBoardView, setCopyGroupHealthBoardView] =
    useState<CopyGroupHealthBoardView>(loadStoredCopyGroupHealthBoardView);
  const [copyGroupHealthSearch, setCopyGroupHealthSearch] = useState("");
  const [selectedCopyGroupHealthGroupIds, setSelectedCopyGroupHealthGroupIds] = useState<string[]>([]);
  const [copyGroupHealthBulkResultSummary, setCopyGroupHealthBulkResultSummary] =
    useState<CopyGroupHealthBulkResultSummary | null>(null);
  const [copyGroupHealthPreferencesHydrated, setCopyGroupHealthPreferencesHydrated] = useState(false);

  useEffect(() => {
    if (!options.user?.id) {
      setCopyGroupHealthPreferencesHydrated(false);
      return;
    }

    setCopyGroupHealthReviewFilter(
      normalizeCopyGroupHealthReviewFilter(options.user.copyGroupHealthReviewFilter),
    );
    setCopyGroupHealthReviews(
      parseCopyGroupHealthReviewsJson(options.user.copyGroupHealthReviewsJson),
    );
    setCopyGroupHealthPreferencesHydrated(true);
  }, [
    options.user?.copyGroupHealthReviewFilter,
    options.user?.copyGroupHealthReviewsJson,
    options.user?.id,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      COPY_GROUP_HEALTH_REVIEW_STORAGE_KEY,
      JSON.stringify(copyGroupHealthReviews),
    );
  }, [copyGroupHealthReviews]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      COPY_GROUP_HEALTH_BOARD_VIEW_STORAGE_KEY,
      copyGroupHealthBoardView,
    );
  }, [copyGroupHealthBoardView]);

  useEffect(() => {
    if (!options.user?.id || !copyGroupHealthPreferencesHydrated) {
      return;
    }

    const persistedFilter = normalizeCopyGroupHealthReviewFilter(
      options.user.copyGroupHealthReviewFilter,
    );
    const persistedReviewsJson = options.user.copyGroupHealthReviewsJson ?? null;
    const nextReviewsJson = JSON.stringify(copyGroupHealthReviews);

    if (
      copyGroupHealthReviewFilter === persistedFilter &&
      nextReviewsJson === (persistedReviewsJson ?? "{}")
    ) {
      return;
    }

    options.saveActivityPreferences({
      copyGroupHealthReviewFilter,
      copyGroupHealthReviewsJson: nextReviewsJson,
    });
  }, [
    copyGroupHealthPreferencesHydrated,
    copyGroupHealthReviewFilter,
    copyGroupHealthReviews,
    options.saveActivityPreferences,
    options.user?.copyGroupHealthReviewFilter,
    options.user?.copyGroupHealthReviewsJson,
    options.user?.id,
  ]);

  const reviewedCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter(
    (entry) => !!copyGroupHealthReviews[entry.groupId],
  ).length;
  const staleCopyGroupHealthReviewCount = options.copyGroupHealthWatchlist.entries.filter((entry) => {
    const storedReview = copyGroupHealthReviews[entry.groupId];
    if (!storedReview) {
      return false;
    }

    return storedReview.concernSignature !== buildCopyGroupHealthConcernSignature(entry);
  }).length;
  const unreviewedCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter((entry) => {
    const storedReview = copyGroupHealthReviews[entry.groupId];
    if (!storedReview) {
      return true;
    }

    return storedReview.concernSignature !== buildCopyGroupHealthConcernSignature(entry);
  }).length;
  const recurringCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter((entry) => {
    const review = copyGroupHealthReviews[entry.groupId];
    return countRecentMatchingHealthReviews(
      review,
      buildCopyGroupHealthConcernSignature(entry),
    ) >= 2;
  }).length;
  const recoverNowCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter(
    (entry) => entry.recoveryQueueLabel === "Recover now",
  ).length;
  const stabilizeSoonCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter(
    (entry) => entry.recoveryQueueLabel === "Stabilize soon",
  ).length;
  const resumeCheckCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter(
    (entry) => entry.recoveryQueueLabel === "Resume check",
  ).length;
  const stageBeforeUseCopyGroupHealthCount = options.copyGroupHealthWatchlist.entries.filter(
    (entry) => entry.recoveryQueueLabel === "Stage before use",
  ).length;
  const recoverNowCopyGroupHealthEntries = options.copyGroupHealthWatchlist.entries.filter(
    (entry) => entry.recoveryQueueLabel === "Recover now",
  );
  const filteredCopyGroupHealthEntries = options.copyGroupHealthWatchlist.entries.filter((entry) => {
    const storedReview = copyGroupHealthReviews[entry.groupId];
    const concernSignature = buildCopyGroupHealthConcernSignature(entry);
    const reviewIsStale =
      !!storedReview &&
      storedReview.concernSignature !== concernSignature;
    const repeatedReviewCount = countRecentMatchingHealthReviews(
      storedReview,
      concernSignature,
    );

    if (copyGroupHealthReviewFilter === "unreviewed") {
      return !storedReview || reviewIsStale;
    }

    if (copyGroupHealthReviewFilter === "reviewed") {
      return !!storedReview && !reviewIsStale;
    }

    if (copyGroupHealthReviewFilter === "stale") {
      return reviewIsStale;
    }

    if (copyGroupHealthReviewFilter === "recurring") {
      return repeatedReviewCount >= 2;
    }

    return true;
  }).filter((entry) => {
    if (copyGroupHealthRecoveryFilter === "recover_now") {
      return entry.recoveryQueueLabel === "Recover now";
    }

    if (copyGroupHealthRecoveryFilter === "stabilize_soon") {
      return entry.recoveryQueueLabel === "Stabilize soon";
    }

    if (copyGroupHealthRecoveryFilter === "resume_check") {
      return entry.recoveryQueueLabel === "Resume check";
    }

    if (copyGroupHealthRecoveryFilter === "stage_before_use") {
      return entry.recoveryQueueLabel === "Stage before use";
    }

    return true;
  }).filter((entry) => {
    const search = copyGroupHealthSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }

    const review = copyGroupHealthReviews[entry.groupId];
    const haystack = [
      entry.groupName,
      entry.detail,
      entry.concernLabel,
      entry.latestRecoveryActionLabel,
      entry.latestRestartRecoveryLabel,
      entry.lastStableSignalLabel,
      entry.signalFreshnessLabel,
      entry.signalFreshnessDetail,
      entry.routingGateLabel,
      entry.routingGateDetail,
      entry.timeInConcernStateLabel,
      review?.note,
      review?.reviewedBy,
      ...(review?.history?.flatMap((item) => [item.note, item.reviewedBy]) ?? []),
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });

  const sortedCopyGroupHealthEntries = [...filteredCopyGroupHealthEntries].sort((left, right) => {
    const leftReview = copyGroupHealthReviews[left.groupId];
    const rightReview = copyGroupHealthReviews[right.groupId];
    const leftReviewIsStale =
      !!leftReview &&
      leftReview.concernSignature !== buildCopyGroupHealthConcernSignature(left);
    const rightReviewIsStale =
      !!rightReview &&
      rightReview.concernSignature !== buildCopyGroupHealthConcernSignature(right);

    const leftPriority =
      leftReviewIsStale
        ? 0
        : left.tone === "danger"
          ? 1
          : !leftReview
            ? 2
            : left.tone === "warn"
              ? 3
              : left.tone === "muted"
                ? 4
                : 5;
    const rightPriority =
      rightReviewIsStale
        ? 0
        : right.tone === "danger"
          ? 1
          : !rightReview
            ? 2
            : right.tone === "warn"
              ? 3
              : right.tone === "muted"
                ? 4
                : 5;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDuration = Number.parseInt(left.timeInConcernStateLabel ?? "0", 10);
    const rightDuration = Number.parseInt(right.timeInConcernStateLabel ?? "0", 10);
    if (leftDuration !== rightDuration) {
      return rightDuration - leftDuration;
    }

    return left.groupName.localeCompare(right.groupName);
  });

  const handleAcknowledgeCopyGroupHealth = (groupId: string) => {
    const entry = options.copyGroupHealthWatchlist.entries.find((item) => item.groupId === groupId);
    if (!entry) {
      return;
    }

    setCopyGroupHealthReviews((current) => ({
      ...current,
      [groupId]: {
        acknowledgedAt: new Date().toISOString(),
        note: copyGroupHealthNotes[groupId]?.trim() ?? "",
        concernSignature: buildCopyGroupHealthConcernSignature(entry),
        reviewedBy: options.user?.username ?? "Operator",
        history: [
          {
            acknowledgedAt: new Date().toISOString(),
            note: copyGroupHealthNotes[groupId]?.trim() ?? "",
            concernSignature: buildCopyGroupHealthConcernSignature(entry),
            reviewedBy: options.user?.username ?? "Operator",
          },
          ...(current[groupId]?.history ?? []),
        ].slice(0, 5),
      },
    }));
  };

  const handleClearCopyGroupHealthReview = (groupId: string) => {
    setCopyGroupHealthReviews((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
  };

  const handleToggleCopyGroupHealthSelection = (groupId: string) => {
    setSelectedCopyGroupHealthGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((value) => value !== groupId)
        : [...current, groupId],
    );
  };

  const handleSelectAllVisibleCopyGroupHealthEntries = () => {
    setSelectedCopyGroupHealthGroupIds(
      sortedCopyGroupHealthEntries.slice(0, 6).map((entry) => entry.groupId),
    );
  };

  const handleSelectAttentionCopyGroupHealthEntries = () => {
    setSelectedCopyGroupHealthGroupIds(
      sortedCopyGroupHealthEntries
        .slice(0, 6)
        .filter((entry) => entry.tone === "danger")
        .map((entry) => entry.groupId),
    );
  };

  const handleSelectRecoverNowCopyGroupHealthEntries = () => {
    setSelectedCopyGroupHealthGroupIds(
      recoverNowCopyGroupHealthEntries
        .slice(0, 3)
        .map((entry) => entry.groupId),
    );
  };

  const handleSelectStaleCopyGroupHealthEntries = () => {
    setSelectedCopyGroupHealthGroupIds(
      sortedCopyGroupHealthEntries
        .slice(0, 6)
        .filter((entry) => {
          const review = copyGroupHealthReviews[entry.groupId];
          return (
            !!review &&
            review.concernSignature !== buildCopyGroupHealthConcernSignature(entry)
          );
        })
        .map((entry) => entry.groupId),
    );
  };

  const handleClearCopyGroupHealthSelection = () => {
    setSelectedCopyGroupHealthGroupIds([]);
  };

  const handleBulkClearCopyGroupHealthReviews = () => {
    const selectedNames = sortedCopyGroupHealthEntries
      .filter((entry) => selectedCopyGroupHealthGroupIds.includes(entry.groupId))
      .map((entry) => entry.groupName);

    setCopyGroupHealthReviews((current) => {
      const next = { ...current };
      for (const groupId of selectedCopyGroupHealthGroupIds) {
        delete next[groupId];
      }
      return next;
    });
    setCopyGroupHealthBulkResultSummary({
      action: "cleared",
      count: selectedNames.length,
      groupNames: selectedNames.slice(0, 3),
      recordedAt: new Date().toISOString(),
    });
    setSelectedCopyGroupHealthGroupIds([]);
  };

  const handleBulkAcknowledgeCopyGroupHealthReviews = () => {
    const selectedIds = new Set(selectedCopyGroupHealthGroupIds);
    const now = new Date().toISOString();
    const selectedNames = sortedCopyGroupHealthEntries
      .filter((entry) => selectedIds.has(entry.groupId))
      .map((entry) => entry.groupName);

    setCopyGroupHealthReviews((current) => {
      const next = { ...current };
      for (const entry of sortedCopyGroupHealthEntries) {
        if (!selectedIds.has(entry.groupId)) {
          continue;
        }

        next[entry.groupId] = {
          acknowledgedAt: now,
          note: copyGroupHealthNotes[entry.groupId]?.trim() ?? "",
          concernSignature: buildCopyGroupHealthConcernSignature(entry),
          reviewedBy: options.user?.username ?? "Operator",
          history: [
            {
              acknowledgedAt: now,
              note: copyGroupHealthNotes[entry.groupId]?.trim() ?? "",
              concernSignature: buildCopyGroupHealthConcernSignature(entry),
              reviewedBy: options.user?.username ?? "Operator",
            },
            ...(current[entry.groupId]?.history ?? []),
          ].slice(0, 5),
        };
      }
      return next;
    });

    setCopyGroupHealthBulkResultSummary({
      action: "acknowledged",
      count: selectedNames.length,
      groupNames: selectedNames.slice(0, 3),
      recordedAt: now,
    });
    setSelectedCopyGroupHealthGroupIds([]);
  };

  return {
    copyGroupHealthReviews,
    copyGroupHealthNotes,
    setCopyGroupHealthNotes,
    copyGroupHealthReviewFilter,
    setCopyGroupHealthReviewFilter,
    copyGroupHealthRecoveryFilter,
    setCopyGroupHealthRecoveryFilter,
    copyGroupHealthBoardView,
    setCopyGroupHealthBoardView,
    copyGroupHealthSearch,
    setCopyGroupHealthSearch,
    selectedCopyGroupHealthGroupIds,
    copyGroupHealthBulkResultSummary,
    reviewedCopyGroupHealthCount,
    staleCopyGroupHealthReviewCount,
    unreviewedCopyGroupHealthCount,
    recurringCopyGroupHealthCount,
    recoverNowCopyGroupHealthCount,
    stabilizeSoonCopyGroupHealthCount,
    resumeCheckCopyGroupHealthCount,
    stageBeforeUseCopyGroupHealthCount,
    recoverNowCopyGroupHealthEntries,
    sortedCopyGroupHealthEntries,
    handleAcknowledgeCopyGroupHealth,
    handleClearCopyGroupHealthReview,
    handleToggleCopyGroupHealthSelection,
    handleSelectAllVisibleCopyGroupHealthEntries,
    handleSelectAttentionCopyGroupHealthEntries,
    handleSelectRecoverNowCopyGroupHealthEntries,
    handleSelectStaleCopyGroupHealthEntries,
    handleClearCopyGroupHealthSelection,
    handleBulkClearCopyGroupHealthReviews,
    handleBulkAcknowledgeCopyGroupHealthReviews,
  };
}
