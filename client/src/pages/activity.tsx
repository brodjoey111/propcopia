import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ActivityCopyGroupAlertBoard } from "@/components/activity-copy-group-alert-board";
import { ActivityCopyGroupHealthBoard } from "@/components/activity-copy-group-health-board";
import { ActivityExecutionFollowUpBoard } from "@/components/activity-execution-follow-up-board";
import { ActivityOperatorAuditBoard } from "@/components/activity-operator-audit-board";
import { ActivityRithmicReadinessBoard } from "@/components/activity-rithmic-readiness-board";
import { ActivityRiskFollowUpBoard } from "@/components/activity-risk-follow-up-board";
import { ActivitySyncRepairBoard } from "@/components/activity-sync-repair-board";
import { ActivitySyncReviewBoard } from "@/components/activity-sync-review-board";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/user-context";
import { notificationsQueryKey, useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import {
  type CopyGroupHealthReviewFilter,
  buildCopyGroupHealthConcernSignature,
  countRecentMatchingHealthReviews,
  useActivityCopyGroupHealthBoard,
} from "@/hooks/use-activity-copy-group-health-board";
import { useActivitySyncRepairBoard } from "@/hooks/use-activity-sync-repair-board";
import {
  type QueueAuditFocus,
  type QueueSort,
  useActivitySyncReviewBoard,
} from "@/hooks/use-activity-sync-review-board";
import { useFollowUpReviewActions } from "@/hooks/use-follow-up-review-actions";
import { useFollowUpReviewData } from "@/hooks/use-follow-up-review-data";
import { useOperatorFollowUpData } from "@/hooks/use-operator-follow-up-data";
import { usePositionSyncReviewData } from "@/hooks/use-position-sync-review-data";
import { usePositionSyncWorkflowActions } from "@/hooks/use-position-sync-workflow-actions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  appendExecutionFollowUpOperatorAssignment,
  appendRiskFollowUpOperatorAssignment,
  buildExecutionFollowUpReviewPayload,
  buildRithmicReadinessReviewPayload,
  buildRiskFollowUpReviewPayload,
  type ExecutionFollowUpFilter,
  type ExecutionFollowUpReviewEntry,
  type RithmicReadinessFollowUpFilter,
  type RiskFollowUpFilter,
  type RiskFollowUpReviewEntry,
} from "@/lib/follow-up-operator";
import {
  LIVE_QUERY_STALE_MS,
  OPERATOR_QUERY_POLL_MS,
} from "@/lib/live-query-config";
import {
  buildCopyGroupHealthWatchlist,
  buildCopyGroupActivityFeed,
  clusterCopyGroupActivityFeed,
  describeCopyGroupPulse,
  filterCopyGroupActivityFeed,
  hydrateCopyGroup,
  summarizeCopyGroups,
  type CopyGroup,
  type CopyGroupSnapshotApiResponse,
} from "@/lib/copy-groups";
import {
  clusterNotifications,
  describeActivityNotificationMessage,
  filterReviewedNotifications,
  toActivityFeedType,
} from "@/lib/notifications";
import {
  buildPositionSyncQueue,
  type PositionSyncRepairCandidateFilter,
} from "@/lib/position-sync-queue";
import {
  buildPositionSyncWorkflowUpdate,
  type PositionSyncWorkflowSaveInput,
} from "@/lib/position-sync-workflow";
import { buildOperatorWorkSummary } from "@/lib/operator-work";
import type {
  AccountsRuntimeOverviewResponse,
  DashboardRuntimeOverviewResponse,
} from "@/lib/runtime-overview";

interface ActivityPageData {
  groups: CopyGroup[];
  feed: ReturnType<typeof buildCopyGroupActivityFeed>;
  activityByGroupId: Record<string, CopyGroupSnapshotApiResponse["groups"][number]["activityPreview"]>;
}

interface CopyGroupAlertFeedItem {
  alertId: string;
  storyKey: string;
  userId: string;
  groupId: string;
  timestamp: string;
  severity: "info" | "warn" | "error";
  title: string;
  message: string;
  accountId?: string;
  source: "activity" | "health";
  healthStatus?: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  restartRecoveryMessage?: string;
  restartRecoveryAt?: string;
}

interface CopyGroupAlertsResponse {
  success: boolean;
  activeStories: CopyGroupAlertFeedItem[];
  recentAlerts: CopyGroupAlertFeedItem[];
  generatedAt: string;
}

interface CopyGroupAlertReviewEntry {
  storyKey: string;
  groupId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: Array<{
    operatorName: string;
    assignedAt: string;
    reason?: string;
  }>;
  reviewedAt?: string;
}

interface CopyGroupAlertReviewsResponse {
  success: boolean;
  reviews: CopyGroupAlertReviewEntry[];
}

type CopyGroupAlertFilter = "all" | "unowned" | "mine" | "reviewed" | "stale";

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function getPositionSyncStatusLabel(
  status: PositionSyncWorkflowSaveInput["status"],
): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "handed_off":
      return "Handed Off";
    case "completed_manually":
      return "Completed Manually";
    case "reviewed":
      return "Reviewed";
    default:
      return "Simulated";
  }
}

function getPositionSyncStatusTone(
  status: PositionSyncWorkflowSaveInput["status"],
): string {
  switch (status) {
    case "completed_manually":
      return "border-emerald-400/30 bg-emerald-400/15 text-emerald-100";
    case "handed_off":
      return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    case "approved":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "reviewed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    default:
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }
}

function getPositionSyncStatusTimestamp(entry: {
  status: PositionSyncWorkflowSaveInput["status"];
  reviewedAt?: string;
  simulatedAt?: string;
  approvedAt?: string;
  handedOffAt?: string;
  completedManuallyAt?: string;
}): string | null {
  if (entry.status === "completed_manually" && entry.completedManuallyAt) {
    return `Completed manually on ${formatTimestamp(entry.completedManuallyAt)}`;
  }

  if (entry.status === "handed_off" && entry.handedOffAt) {
    return `Handed off on ${formatTimestamp(entry.handedOffAt)}`;
  }

  if (entry.status === "approved" && entry.approvedAt) {
    return `Approved on ${formatTimestamp(entry.approvedAt)}`;
  }

  if (entry.status === "reviewed" && entry.reviewedAt) {
    return `Reviewed on ${formatTimestamp(entry.reviewedAt)}`;
  }

  if (entry.simulatedAt) {
    return `Simulated on ${formatTimestamp(entry.simulatedAt)}`;
  }

  return null;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

async function loadActivityPageData(): Promise<ActivityPageData> {
  const snapshot = await getJson<CopyGroupSnapshotApiResponse>("/api/copy-groups/snapshot");
  const groups = snapshot.groups.map((group) => hydrateCopyGroup(group));
  const activityByGroupId = Object.fromEntries(
    snapshot.groups.map((group) => [group.group.group.groupId, group.activityPreview]),
  );

  return {
    groups,
    feed: buildCopyGroupActivityFeed(groups, activityByGroupId),
    activityByGroupId,
  };
}

function isCopyGroupAlertReviewStale(
  alert: CopyGroupAlertFeedItem,
  review: CopyGroupAlertReviewEntry | undefined,
): boolean {
  if (!review?.reviewedAt) {
    return false;
  }

  const reviewedAtMs = new Date(review.reviewedAt).getTime();
  const alertAtMs = new Date(alert.timestamp).getTime();
  return !Number.isNaN(reviewedAtMs) && !Number.isNaN(alertAtMs) && reviewedAtMs < alertAtMs;
}

function getCopyGroupAlertFreshnessLabel(
  alert: CopyGroupAlertFeedItem,
  review: CopyGroupAlertReviewEntry | undefined,
): {
  label: string;
  toneClass: string;
} {
  if (!review) {
    return {
      label: "New alert",
      toneClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    };
  }

  if (isCopyGroupAlertReviewStale(alert, review)) {
    return {
      label: "Retriggered after review",
      toneClass: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    };
  }

  if (review.status === "reviewed") {
    return {
      label: "Covered by review",
      toneClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  return {
    label: "Owned and pending",
    toneClass: "border-white/10 bg-white/[0.04] text-zinc-200",
  };
}

export default function Activity() {
  const { toast } = useToast();
  const { user } = useUser();
  const {
    data,
    isLoading,
    error,
  } = useQuery<ActivityPageData>({
    queryKey: ["/api/copy-groups", "activity-page"],
    queryFn: loadActivityPageData,
    refetchInterval: OPERATOR_QUERY_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: copyGroupAlertsData } = useQuery<CopyGroupAlertsResponse>({
    queryKey: ["/api/copy-groups", "alerts"],
    queryFn: () => getJson<CopyGroupAlertsResponse>("/api/copy-groups/alerts"),
    refetchInterval: OPERATOR_QUERY_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: copyGroupAlertReviewsData } = useQuery<CopyGroupAlertReviewsResponse>({
    queryKey: ["/api/copy-groups", "alert-reviews"],
    queryFn: () => getJson<CopyGroupAlertReviewsResponse>("/api/copy-groups/alert-reviews"),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: notificationsData } = useNotifications();
  const {
    positionSyncPlansData,
    positionSyncWorkflowData,
    positionSyncWorkflowState,
    positionSyncRepairCandidates,
    positionSyncRepairBoardSummary,
    positionSyncRepairSummary,
  } = usePositionSyncReviewData({
    userId: user?.id,
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: accountsOverviewData } = useQuery<AccountsRuntimeOverviewResponse | null>({
    queryKey: user?.id ? ["/api/runtime/accounts-overview", user.id] : ["/api/runtime/accounts-overview", "anonymous"],
    queryFn: async ({ queryKey }) => getJson(queryKey[0] as string),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: dashboardRuntimeOverviewData } = useQuery<DashboardRuntimeOverviewResponse | null>({
    queryKey: user?.id ? ["/api/runtime/dashboard-overview", user.id] : ["/api/runtime/dashboard-overview", "anonymous"],
    queryFn: async ({ queryKey }) => getJson(queryKey[0] as string),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const {
    riskFollowUpReviewData,
    executionFollowUpReviewData,
    rithmicReadinessReviewData,
    riskReviewsByAccountId,
    executionReviewsByHistoryId,
    rithmicReadinessReviewsByStoryKey,
  } = useFollowUpReviewData(user?.id);
  const [showReviewed, setShowReviewed] = useState(true);
  const [copyGroupAlertNotes, setCopyGroupAlertNotes] = useState<Record<string, string>>({});
  const [copyGroupAlertFilter, setCopyGroupAlertFilter] = useState<CopyGroupAlertFilter>("all");
  const [copyGroupAlertSearch, setCopyGroupAlertSearch] = useState("");
  const [selectedCopyGroupAlertStoryKeys, setSelectedCopyGroupAlertStoryKeys] = useState<string[]>([]);
  const [riskFollowUpSearch, setRiskFollowUpSearch] = useState("");
  const [riskFollowUpNotes, setRiskFollowUpNotes] = useState<Record<string, string>>({});
  const [riskFollowUpFilter, setRiskFollowUpFilter] = useState<RiskFollowUpFilter>("all");
  const [selectedRiskFollowUpAccountIds, setSelectedRiskFollowUpAccountIds] = useState<string[]>([]);
  const [executionFollowUpSearch, setExecutionFollowUpSearch] = useState("");
  const [executionFollowUpNotes, setExecutionFollowUpNotes] = useState<Record<string, string>>({});
  const [executionFollowUpFilter, setExecutionFollowUpFilter] = useState<ExecutionFollowUpFilter>("all");
  const [selectedExecutionFollowUpHistoryIds, setSelectedExecutionFollowUpHistoryIds] = useState<string[]>([]);
  const [rithmicReadinessSearch, setRithmicReadinessSearch] = useState("");
  const [rithmicReadinessNotes, setRithmicReadinessNotes] = useState<Record<string, string>>({});
  const [rithmicReadinessFilter, setRithmicReadinessFilter] =
    useState<RithmicReadinessFollowUpFilter>("all");
  const [selectedRithmicReadinessStoryKeys, setSelectedRithmicReadinessStoryKeys] = useState<string[]>([]);

  useEffect(() => {
    setShowReviewed(user?.showReviewedNotifications ?? true);
  }, [user?.showReviewedNotifications]);

  const groups = data?.groups ?? [];
  const copyGroupOverview = summarizeCopyGroups(groups);
  const copyGroupPulse = describeCopyGroupPulse(copyGroupOverview);
  const copyGroupHealthWatchlist = buildCopyGroupHealthWatchlist(
    groups,
    data?.activityByGroupId ?? {},
  );
  const allActivity = clusterCopyGroupActivityFeed(data?.feed ?? []);
  const alertActivity = filterCopyGroupActivityFeed(allActivity, "alerts");
  const copyGroupAlertStories = copyGroupAlertsData?.activeStories ?? [];
  const recentCopyGroupAlerts = copyGroupAlertsData?.recentAlerts ?? [];
  const copyGroupAlertReviews = copyGroupAlertReviewsData?.reviews ?? [];
  const copyGroupAlertReviewsByStoryKey = new Map(
    copyGroupAlertReviews.map((review) => [review.storyKey, review]),
  );
  const unownedCopyGroupAlertCount = copyGroupAlertStories.filter(
    (alert) => !copyGroupAlertReviewsByStoryKey.get(alert.storyKey)?.operatorName,
  ).length;
  const newCopyGroupAlertCount = copyGroupAlertStories.filter(
    (alert) => getCopyGroupAlertFreshnessLabel(alert, copyGroupAlertReviewsByStoryKey.get(alert.storyKey)).label === "New alert",
  ).length;
  const myCopyGroupAlertCount = copyGroupAlertStories.filter(
    (alert) => copyGroupAlertReviewsByStoryKey.get(alert.storyKey)?.operatorName === user?.username,
  ).length;
  const reviewedCopyGroupAlertCount = copyGroupAlertStories.filter(
    (alert) => copyGroupAlertReviewsByStoryKey.get(alert.storyKey)?.status === "reviewed",
  ).length;
  const staleCopyGroupAlertCount = copyGroupAlertStories.filter((alert) =>
    isCopyGroupAlertReviewStale(alert, copyGroupAlertReviewsByStoryKey.get(alert.storyKey)),
  ).length;
  const filteredCopyGroupAlertStories = copyGroupAlertStories.filter((alert) => {
    const review = copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
    const searchNeedle = copyGroupAlertSearch.trim().toLowerCase();
    const matchesFilter =
      copyGroupAlertFilter === "all"
        ? true
        : copyGroupAlertFilter === "unowned"
          ? !review?.operatorName
          : copyGroupAlertFilter === "mine"
            ? review?.operatorName === user?.username
            : copyGroupAlertFilter === "reviewed"
              ? review?.status === "reviewed"
              : isCopyGroupAlertReviewStale(alert, review);

    if (!matchesFilter) {
      return false;
    }

    if (!searchNeedle) {
      return true;
    }

    return [
      alert.title,
      alert.message,
      alert.restartRecoveryMessage,
      alert.groupId,
      alert.storyKey,
      review?.operatorName,
      review?.note,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(searchNeedle));
  });
  const sortedCopyGroupAlertStories = [...filteredCopyGroupAlertStories].sort((left, right) => {
    const leftReview = copyGroupAlertReviewsByStoryKey.get(left.storyKey);
    const rightReview = copyGroupAlertReviewsByStoryKey.get(right.storyKey);
    const leftUnowned = !leftReview?.operatorName ? 0 : 1;
    const rightUnowned = !rightReview?.operatorName ? 0 : 1;
    if (leftUnowned !== rightUnowned) {
      return leftUnowned - rightUnowned;
    }

    const leftStale = isCopyGroupAlertReviewStale(left, leftReview) ? 0 : 1;
    const rightStale = isCopyGroupAlertReviewStale(right, rightReview) ? 0 : 1;
    if (leftStale !== rightStale) {
      return leftStale - rightStale;
    }

    const severityRank = new Map<CopyGroupAlertFeedItem["severity"], number>([
      ["error", 0],
      ["warn", 1],
      ["info", 2],
    ]);
    const leftSeverity = severityRank.get(left.severity) ?? 99;
    const rightSeverity = severityRank.get(right.severity) ?? 99;
    if (leftSeverity !== rightSeverity) {
      return leftSeverity - rightSeverity;
    }

    return right.timestamp.localeCompare(left.timestamp);
  });
  const notifications = filterReviewedNotifications(
    notificationsData?.notifications ?? [],
    showReviewed,
  );
  const clusteredNotifications = clusterNotifications(notifications);
  const unreadEstimate = notificationsData?.unreadEstimate ?? 0;
  const {
    riskFollowUpItems,
    filteredRiskFollowUpItems,
    riskFollowUpSummary,
    executionFollowUpItems,
    filteredExecutionFollowUpItems,
    executionFollowUpSummary,
    rithmicReadinessFollowUpItems,
    filteredRithmicReadinessFollowUpItems,
    rithmicReadinessFollowUpSummary,
    visibleRithmicReadinessFollowUpItems,
  } = useOperatorFollowUpData({
    notifications: notificationsData?.notifications ?? [],
    showReviewed,
    accountRiskAccounts: accountsOverviewData?.accountRiskOverview.accounts ?? [],
    executionRecovery: dashboardRuntimeOverviewData?.tradeAnalytics.executionRecovery,
    riskReviews: riskFollowUpReviewData?.reviews ?? [],
    executionReviews: executionFollowUpReviewData?.reviews ?? [],
    rithmicReadinessReviews: rithmicReadinessReviewData?.reviews ?? [],
    riskFilter: riskFollowUpFilter,
    riskSearch: riskFollowUpSearch,
    executionFilter: executionFollowUpFilter,
    executionSearch: executionFollowUpSearch,
    executionNotes: executionFollowUpNotes,
    rithmicReadinessFilter,
    rithmicReadinessSearch,
  });
  const {
    reviewedCount: reviewedRiskFollowUpCount,
    ownedCount: ownedRiskFollowUpCount,
    unownedCount: unownedRiskFollowUpCount,
    reassignedCount: reassignedRiskFollowUpCount,
  } = riskFollowUpSummary;
  const {
    reviewedCount: reviewedExecutionFollowUpCount,
    failedCount: failedExecutionFollowUpCount,
    staleCount: staleExecutionFollowUpCount,
    partialCount: partialExecutionFollowUpCount,
    activeCount: activeExecutionFollowUpCount,
  } = executionFollowUpSummary;
  const {
    reviewedCount: reviewedRithmicReadinessCount,
    ownedCount: ownedRithmicReadinessCount,
    unownedCount: unownedRithmicReadinessCount,
    reassignedCount: reassignedRithmicReadinessCount,
  } = rithmicReadinessFollowUpSummary;
  const positionSyncQueue = buildPositionSyncQueue(
    positionSyncPlansData,
    positionSyncWorkflowData?.reviews ?? [],
  );
  const operatorWorkSummary = buildOperatorWorkSummary({
    riskItems: riskFollowUpItems,
    executionItems: executionFollowUpItems,
    rithmicReadinessItems: visibleRithmicReadinessFollowUpItems,
    syncItems: positionSyncQueue,
  });
  const reviewedSyncCount = Object.values(positionSyncWorkflowState).filter(
    (entry) => entry.status === "reviewed",
  ).length;
  const simulatedSyncCount = Object.values(positionSyncWorkflowState).filter(
    (entry) => entry.status === "simulated",
  ).length;
  const approvedSyncCount = Object.values(positionSyncWorkflowState).filter(
    (entry) => entry.status === "approved",
  ).length;
  const handedOffSyncCount = Object.values(positionSyncWorkflowState).filter(
    (entry) => entry.status === "handed_off",
  ).length;
  const completedManuallySyncCount = Object.values(positionSyncWorkflowState).filter(
    (entry) => entry.status === "completed_manually",
  ).length;

  const buildCopyGroupAlertReviewPayload = (input: {
    alert: CopyGroupAlertFeedItem;
    currentReview?: CopyGroupAlertReviewEntry;
    status: "pending" | "reviewed";
    operatorName?: string;
    note?: string;
    assignmentReason?: string;
    reviewedAt?: string;
  }): CopyGroupAlertReviewEntry => ({
    storyKey: input.alert.storyKey,
    groupId: input.alert.groupId,
    status: input.status,
    note: input.note,
    operatorName: input.operatorName,
    operatorHistory: input.assignmentReason && input.operatorName
      ? [
          ...(input.currentReview?.operatorHistory ?? []),
          {
            operatorName: input.operatorName,
            assignedAt: new Date().toISOString(),
            reason: input.assignmentReason,
          },
        ]
      : input.currentReview?.operatorHistory,
    reviewedAt: input.reviewedAt,
  });

  const handleTakeCopyGroupAlertOwnership = (alert: CopyGroupAlertFeedItem) => {
    if (!user?.id) {
      return;
    }

    const currentReview = copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
    saveCopyGroupAlertReviewsMutation.mutate([
      buildCopyGroupAlertReviewPayload({
        alert,
        currentReview,
        status: currentReview?.status ?? "pending",
        operatorName: user.username,
        note: copyGroupAlertNotes[alert.storyKey]?.trim() || currentReview?.note,
        assignmentReason: currentReview?.operatorName
          ? "Reassigned shared copy-group alert ownership"
          : "Claimed shared copy-group alert",
        reviewedAt: currentReview?.reviewedAt,
      }),
    ]);
  };

  const handleAcknowledgeCopyGroupAlert = (alert: CopyGroupAlertFeedItem) => {
    if (!user?.id) {
      return;
    }

    const currentReview = copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
    const now = new Date().toISOString();
    saveCopyGroupAlertReviewsMutation.mutate([
      buildCopyGroupAlertReviewPayload({
        alert,
        currentReview,
        status: "reviewed",
        operatorName: currentReview?.operatorName ?? user.username,
        note: copyGroupAlertNotes[alert.storyKey]?.trim() || currentReview?.note,
        assignmentReason: "Acknowledged shared copy-group alert",
        reviewedAt: now,
      }),
    ]);
  };

  const handleReopenCopyGroupAlert = (alert: CopyGroupAlertFeedItem) => {
    if (!user?.id) {
      return;
    }

    const currentReview = copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
    saveCopyGroupAlertReviewsMutation.mutate([
      buildCopyGroupAlertReviewPayload({
        alert,
        currentReview,
        status: "pending",
        operatorName: currentReview?.operatorName ?? user.username,
        note: copyGroupAlertNotes[alert.storyKey]?.trim() || currentReview?.note,
        assignmentReason: "Reopened shared copy-group alert",
      }),
    ]);
  };
  const handleToggleCopyGroupAlertSelection = (storyKey: string) => {
    setSelectedCopyGroupAlertStoryKeys((current) =>
      current.includes(storyKey)
        ? current.filter((value) => value !== storyKey)
        : [...current, storyKey],
    );
  };

  const handleSelectAllVisibleCopyGroupAlerts = () => {
    setSelectedCopyGroupAlertStoryKeys(
      sortedCopyGroupAlertStories.slice(0, 6).map((alert) => alert.storyKey),
    );
  };

  const handleSelectUnownedCopyGroupAlerts = () => {
    setSelectedCopyGroupAlertStoryKeys(
      sortedCopyGroupAlertStories
        .slice(0, 6)
        .filter((alert) => !copyGroupAlertReviewsByStoryKey.get(alert.storyKey)?.operatorName)
        .map((alert) => alert.storyKey),
    );
  };

  const handleClearCopyGroupAlertSelection = () => {
    setSelectedCopyGroupAlertStoryKeys([]);
  };

  const handleBulkTakeCopyGroupAlertOwnership = () => {
    if (!user?.id || selectedCopyGroupAlertStoryKeys.length === 0) {
      return;
    }

    saveCopyGroupAlertReviewsMutation.mutate(
      sortedCopyGroupAlertStories
        .filter((alert) => selectedCopyGroupAlertStoryKeys.includes(alert.storyKey))
        .map((alert) => {
          const currentReview = copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
          return buildCopyGroupAlertReviewPayload({
            alert,
            currentReview,
            status: currentReview?.status ?? "pending",
            operatorName: user.username,
            note: copyGroupAlertNotes[alert.storyKey]?.trim() || currentReview?.note,
            assignmentReason: currentReview?.operatorName
              ? "Reassigned shared copy-group alert ownership"
              : "Claimed shared copy-group alert",
            reviewedAt: currentReview?.reviewedAt,
          });
        }),
    );
    setSelectedCopyGroupAlertStoryKeys([]);
  };

  const handleBulkAcknowledgeCopyGroupAlerts = () => {
    if (!user?.id || selectedCopyGroupAlertStoryKeys.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveCopyGroupAlertReviewsMutation.mutate(
      sortedCopyGroupAlertStories
        .filter((alert) => selectedCopyGroupAlertStoryKeys.includes(alert.storyKey))
        .map((alert) => {
          const currentReview = copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
          return buildCopyGroupAlertReviewPayload({
            alert,
            currentReview,
            status: "reviewed",
            operatorName: currentReview?.operatorName ?? user.username,
            note: copyGroupAlertNotes[alert.storyKey]?.trim() || currentReview?.note,
            assignmentReason: "Acknowledged shared copy-group alert",
            reviewedAt: now,
          });
        }),
    );
    setSelectedCopyGroupAlertStoryKeys([]);
  };
  const saveActivityPreferencesMutation = useMutation({
    mutationFn: async (settings: {
      activityQueueSort?: QueueSort;
      activityQueueAuditFocus?: QueueAuditFocus;
      copyGroupHealthReviewFilter?: CopyGroupHealthReviewFilter;
      copyGroupHealthReviewsJson?: string | null;
    }) => {
      const response = await apiRequest("PATCH", "/api/user/settings", settings);
      return response.json() as Promise<{
        success: boolean;
        user: NonNullable<typeof user>;
      }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/auth/me"], result);
    },
  });
  const {
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
  } = useActivityCopyGroupHealthBoard({
    user,
    copyGroupHealthWatchlist,
    saveActivityPreferences: (settings) => saveActivityPreferencesMutation.mutate(settings),
  });
  const saveCopyGroupAlertReviewsMutation = useMutation({
    mutationFn: async (reviews: CopyGroupAlertReviewEntry[]) => {
      const response = await apiRequest("POST", "/api/copy-groups/alert-reviews", {
        reviews,
      });
      return response.json() as Promise<CopyGroupAlertReviewsResponse>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/copy-groups", "alert-reviews"], result);
      queryClient.invalidateQueries({ queryKey: ["/api/copy-groups", "alerts"] });
      toast({
        title: "Alert Workflow Updated",
        description: "Shared copy-group alert ownership and review state saved.",
      });
    },
  });
  const {
    savePositionSyncWorkflowMutation,
    simulatePositionSyncMutation,
  } = usePositionSyncWorkflowActions({
    userId: user?.id,
    onSuccess: (_result, reviews) => {
      const latestStatus = reviews[0]?.status;
      toast({
        title: "Sync Workflow Updated",
        description: latestStatus
          ? `${getPositionSyncStatusLabel(latestStatus)} status saved for ${reviews.length} sync item${reviews.length === 1 ? "" : "s"}.`
          : "Sync workflow status saved.",
      });
    },
    onSimulationSuccess: (result) => {
      toast({
        title: "Sync Simulation Recorded",
        description: `${result.simulations.length} repair plan${result.simulations.length === 1 ? " was" : "s were"} validated. No broker orders were submitted.`,
      });
    },
  });
  const {
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
  } = useActivitySyncRepairBoard({
    user,
    positionSyncRepairCandidates,
    positionSyncWorkflowState,
    savePositionSyncWorkflow: (reviews) => savePositionSyncWorkflowMutation.mutate(reviews),
    simulatePositionSync: (targets) => simulatePositionSyncMutation.mutate(targets),
  });
  const {
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
  } = useActivitySyncReviewBoard({
    user,
    positionSyncQueue,
    positionSyncWorkflowState,
    savePositionSyncWorkflow: (reviews) => savePositionSyncWorkflowMutation.mutate(reviews),
    saveActivityPreferences: (settings) => saveActivityPreferencesMutation.mutate(settings),
  });
  const {
    saveRiskFollowUpReviewsMutation,
    saveExecutionFollowUpReviewsMutation,
    saveRithmicReadinessReviewsMutation,
    recheckExecutionFollowUpItemMutation,
    recheckRithmicReadinessMutation,
  } = useFollowUpReviewActions({
    userId: user?.id,
    onRiskSuccess: () => {
      toast({
        title: "Risk Queue Updated",
        description: "Shared risk follow-up ownership and review state saved.",
      });
    },
    onExecutionSuccess: () => {
      toast({
        title: "Execution Queue Updated",
      description: "Shared execution ownership and review state saved.",
      });
    },
  });

  const handleTakeRithmicReadinessOwnership = (storyKey: string) => {
    if (!user?.id) {
      return;
    }

    const item = rithmicReadinessFollowUpItems.find((entry) => entry.storyKey === storyKey);
    if (!item) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey) ?? item.review;
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || currentReview?.note,
        status: currentReview?.status ?? "pending",
        assignmentReason: currentReview?.operatorName
          ? "Reassigned Rithmic readiness ownership"
          : "Claimed Rithmic readiness follow-up",
        reviewedAt: now,
      }),
    ]);
  };

  const handleSaveRithmicReadinessNote = (storyKey: string) => {
    if (!user?.id) {
      return;
    }

    const item = rithmicReadinessFollowUpItems.find((entry) => entry.storyKey === storyKey);
    if (!item) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey) ?? item.review;
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || undefined,
        status: currentReview?.status ?? "pending",
      }),
    ]);
  };

  const handleMarkRithmicReadinessReviewed = (storyKey: string) => {
    if (!user?.id) {
      return;
    }

    const item = rithmicReadinessFollowUpItems.find((entry) => entry.storyKey === storyKey);
    if (!item) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey) ?? item.review;
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || currentReview?.note,
        status: "reviewed",
        assignmentReason: "Reviewed Rithmic readiness alert",
        reviewedAt: now,
      }),
    ]);
  };

  const handleReopenRithmicReadinessAlert = (storyKey: string) => {
    if (!user?.id) {
      return;
    }

    const item = rithmicReadinessFollowUpItems.find((entry) => entry.storyKey === storyKey);
    if (!item) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey) ?? item.review;
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId: item.accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || currentReview?.note,
        status: "pending",
        assignmentReason: "Reopened Rithmic readiness alert",
        reviewedAt: now,
      }),
    ]);
  };

  const handleToggleRithmicReadinessSelection = (storyKey: string) => {
    setSelectedRithmicReadinessStoryKeys((current) =>
      current.includes(storyKey)
        ? current.filter((value) => value !== storyKey)
        : [...current, storyKey],
    );
  };

  const handleSelectAllVisibleRithmicReadinessItems = () => {
    setSelectedRithmicReadinessStoryKeys(
      filteredRithmicReadinessFollowUpItems.map((item) => item.storyKey),
    );
  };

  const handleSelectUnownedRithmicReadinessItems = () => {
    setSelectedRithmicReadinessStoryKeys(
      filteredRithmicReadinessFollowUpItems
        .filter((item) => !item.review?.operatorName)
        .map((item) => item.storyKey),
    );
  };

  const handleClearRithmicReadinessSelection = () => {
    setSelectedRithmicReadinessStoryKeys([]);
  };

  const handleBulkTakeRithmicReadinessOwnership = () => {
    if (!user?.id || selectedRithmicReadinessStoryKeys.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate(
      filteredRithmicReadinessFollowUpItems
        .filter((item) => selectedRithmicReadinessStoryKeys.includes(item.storyKey))
        .map((item) =>
          buildRithmicReadinessReviewPayload({
            storyKey: item.storyKey,
            accountId: item.accountId,
            currentReview: item.review,
            operatorName: user.username,
            note: rithmicReadinessNotes[item.storyKey]?.trim() || item.review?.note,
            status: item.review?.status ?? "pending",
            assignmentReason: item.review?.operatorName
              ? "Reassigned Rithmic readiness ownership"
              : "Claimed Rithmic readiness follow-up",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedRithmicReadinessStoryKeys([]);
  };

  const handleBulkMarkRithmicReadinessReviewed = () => {
    if (!user?.id || selectedRithmicReadinessStoryKeys.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate(
      filteredRithmicReadinessFollowUpItems
        .filter((item) => selectedRithmicReadinessStoryKeys.includes(item.storyKey))
        .map((item) =>
          buildRithmicReadinessReviewPayload({
            storyKey: item.storyKey,
            accountId: item.accountId,
            currentReview: item.review,
            operatorName: item.review?.operatorName ?? user.username,
            note: rithmicReadinessNotes[item.storyKey]?.trim() || item.review?.note,
            status: "reviewed",
            assignmentReason: "Reviewed Rithmic readiness alert",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedRithmicReadinessStoryKeys([]);
  };

  const handleBulkReopenRithmicReadinessItems = () => {
    if (!user?.id || selectedRithmicReadinessStoryKeys.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate(
      filteredRithmicReadinessFollowUpItems
        .filter((item) => selectedRithmicReadinessStoryKeys.includes(item.storyKey))
        .map((item) =>
          buildRithmicReadinessReviewPayload({
            storyKey: item.storyKey,
            accountId: item.accountId,
            currentReview: item.review,
            operatorName: item.review?.operatorName ?? user.username,
            note: rithmicReadinessNotes[item.storyKey]?.trim() || item.review?.note,
            status: "pending",
            assignmentReason: "Reopened Rithmic readiness alert",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedRithmicReadinessStoryKeys([]);
  };

  const handleRithmicReadinessRecheck = async (storyKey: string) => {
    const item = rithmicReadinessFollowUpItems.find((entry) => entry.storyKey === storyKey);
    if (!item) {
      return;
    }

    try {
      const result = await recheckRithmicReadinessMutation.mutateAsync(item.accountId);
      toast({
        title: "Rithmic Readiness Rechecked",
        description: result.readiness.ready
          ? `${result.readiness.accountName} is ready after the latest saved-account check.`
          : `${result.readiness.accountName} refreshed. ${result.readiness.blockers[0] ?? "Reconnect proof still needs follow-up."}`,
      });
    } catch (error) {
      toast({
        title: "Rithmic Re-check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkRecheckRithmicReadinessItems = async () => {
    const selectedItems = filteredRithmicReadinessFollowUpItems.filter((item) =>
      selectedRithmicReadinessStoryKeys.includes(item.storyKey),
    );
    if (selectedItems.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedItems.map((item) => recheckRithmicReadinessMutation.mutateAsync(item.accountId)),
      );
      setSelectedRithmicReadinessStoryKeys([]);
      toast({
        title: "Rithmic Readiness Rechecked",
        description: `${selectedItems.length} saved account${selectedItems.length === 1 ? "" : "s"} refreshed for reconnect proof.`,
      });
    } catch (error) {
      toast({
        title: "Bulk Rithmic Re-check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleTakeRiskFollowUpOwnership = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = riskReviewsByAccountId.get(accountId);
    const now = new Date().toISOString();

    saveRiskFollowUpReviewsMutation.mutate([
      buildRiskFollowUpReviewPayload({
        accountId,
        currentReview,
        operatorName: user.username,
        note: riskFollowUpNotes[accountId]?.trim() || currentReview?.note,
        status: currentReview?.status ?? "pending",
        assignmentReason: currentReview?.operatorName
          ? "Reassigned risk follow-up ownership"
          : "Claimed unassigned risk follow-up",
        reviewedAt: now,
      }),
    ]);
  };

  const handleSaveRiskFollowUpNote = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = riskReviewsByAccountId.get(accountId);
    saveRiskFollowUpReviewsMutation.mutate([
      buildRiskFollowUpReviewPayload({
        accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: riskFollowUpNotes[accountId]?.trim() || undefined,
        status: currentReview?.status ?? "pending",
      }),
    ]);
  };

  const handleMarkRiskFollowUpReviewed = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = riskReviewsByAccountId.get(accountId);
    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate([
      buildRiskFollowUpReviewPayload({
        accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: riskFollowUpNotes[accountId]?.trim() || currentReview?.note,
        status: "reviewed",
        assignmentReason: "Reviewed risk follow-up item",
        reviewedAt: now,
      }),
    ]);
  };

  const handleReopenRiskFollowUpItem = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = riskReviewsByAccountId.get(accountId);
    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate([
      buildRiskFollowUpReviewPayload({
        accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: riskFollowUpNotes[accountId]?.trim() || currentReview?.note,
        status: "pending",
        assignmentReason: "Reopened risk follow-up item",
        reviewedAt: now,
      }),
    ]);
  };

  const handleToggleRiskFollowUpSelection = (accountId: string) => {
    setSelectedRiskFollowUpAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId],
    );
  };

  const handleSelectAllVisibleRiskFollowUpItems = () => {
    setSelectedRiskFollowUpAccountIds(filteredRiskFollowUpItems.map((item) => item.accountId));
  };

  const handleSelectUnownedRiskFollowUpItems = () => {
    setSelectedRiskFollowUpAccountIds(
      filteredRiskFollowUpItems
        .filter((item) => !item.review?.operatorName)
        .map((item) => item.accountId),
    );
  };

  const handleClearRiskFollowUpSelection = () => {
    setSelectedRiskFollowUpAccountIds([]);
  };

  const handleBulkTakeRiskFollowUpOwnership = () => {
    if (!user?.id || selectedRiskFollowUpAccountIds.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate(
      filteredRiskFollowUpItems
        .filter((item) => selectedRiskFollowUpAccountIds.includes(item.accountId))
        .map((item) =>
          buildRiskFollowUpReviewPayload({
            accountId: item.accountId,
            currentReview: item.review,
            operatorName: user.username,
            note: riskFollowUpNotes[item.accountId]?.trim() || item.review?.note,
            status: item.review?.status ?? "pending",
            assignmentReason: item.review?.operatorName
              ? "Reassigned risk follow-up ownership"
              : "Claimed unassigned risk follow-up",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedRiskFollowUpAccountIds([]);
  };

  const handleBulkMarkRiskFollowUpReviewed = () => {
    if (!user?.id || selectedRiskFollowUpAccountIds.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate(
      filteredRiskFollowUpItems
        .filter((item) => selectedRiskFollowUpAccountIds.includes(item.accountId))
        .map((item) =>
          buildRiskFollowUpReviewPayload({
            accountId: item.accountId,
            currentReview: item.review,
            operatorName: item.review?.operatorName ?? user.username,
            note: riskFollowUpNotes[item.accountId]?.trim() || item.review?.note,
            status: "reviewed",
            assignmentReason: "Reviewed risk follow-up item",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedRiskFollowUpAccountIds([]);
  };

  const handleBulkReopenRiskFollowUpItems = () => {
    if (!user?.id || selectedRiskFollowUpAccountIds.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate(
      filteredRiskFollowUpItems
        .filter((item) => selectedRiskFollowUpAccountIds.includes(item.accountId))
        .map((item) =>
          buildRiskFollowUpReviewPayload({
            accountId: item.accountId,
            currentReview: item.review,
            operatorName: item.review?.operatorName ?? user.username,
            note: riskFollowUpNotes[item.accountId]?.trim() || item.review?.note,
            status: "pending",
            assignmentReason: "Reopened risk follow-up item",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedRiskFollowUpAccountIds([]);
  };
  const handleToggleExecutionFollowUpSelection = (historyId: string) => {
    setSelectedExecutionFollowUpHistoryIds((current) =>
      current.includes(historyId)
        ? current.filter((id) => id !== historyId)
        : [...current, historyId],
    );
  };

  const handleSelectAllVisibleExecutionFollowUpItems = () => {
    setSelectedExecutionFollowUpHistoryIds(
      filteredExecutionFollowUpItems.map((item) => item.historyId),
    );
  };

  const handleSelectFailedExecutionFollowUpItems = () => {
    setSelectedExecutionFollowUpHistoryIds(
      filteredExecutionFollowUpItems
        .filter((item) => item.category === "failed")
        .map((item) => item.historyId),
    );
  };

  const handleClearExecutionFollowUpSelection = () => {
    setSelectedExecutionFollowUpHistoryIds([]);
  };

  const handleExecutionFollowUpRecheck = async (historyId: string) => {
    try {
      await recheckExecutionFollowUpItemMutation.mutateAsync(historyId);
      toast({
        title: "Execution Rechecked",
        description: "The latest stored lifecycle state was refreshed for this execution.",
      });
    } catch (error) {
      toast({
        title: "Execution Recheck Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleTakeExecutionFollowUpOwnership = (historyId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = executionReviewsByHistoryId.get(historyId);
    const now = new Date().toISOString();
    saveExecutionFollowUpReviewsMutation.mutate([
      buildExecutionFollowUpReviewPayload({
        historyId,
        currentReview,
        operatorName: user.username,
        note: executionFollowUpNotes[historyId]?.trim() || currentReview?.note,
        status: currentReview?.status ?? "pending",
        assignmentReason: currentReview?.operatorName
          ? "Reassigned execution follow-up ownership"
          : "Claimed execution follow-up",
        reviewedAt: now,
      }),
    ]);
  };

  const handleSaveExecutionFollowUpNote = (historyId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = executionReviewsByHistoryId.get(historyId);
    saveExecutionFollowUpReviewsMutation.mutate([
      buildExecutionFollowUpReviewPayload({
        historyId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: executionFollowUpNotes[historyId]?.trim() || undefined,
        status: currentReview?.status ?? "pending",
      }),
    ]);
  };

  const handleExecutionFollowUpReview = async (historyId: string) => {
    try {
      if (!user?.id) {
        return;
      }

      const currentReview = executionReviewsByHistoryId.get(historyId);
      const note = executionFollowUpNotes[historyId]?.trim();
      const now = new Date().toISOString();
      await saveExecutionFollowUpReviewsMutation.mutateAsync([
        buildExecutionFollowUpReviewPayload({
          historyId,
          currentReview,
          operatorName: currentReview?.operatorName ?? user.username,
          note: note && note.length > 0 ? note : currentReview?.note,
          status: "reviewed",
          assignmentReason: "Reviewed execution follow-up item",
          reviewedAt: now,
        }),
      ]);
      setExecutionFollowUpNotes((current) => {
        const next = { ...current };
        delete next[historyId];
        return next;
      });
      toast({
        title: "Execution Reviewed",
        description: "That failed execution is now marked as reviewed across the shared operator surfaces.",
      });
    } catch (error) {
      toast({
        title: "Execution Review Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReopenExecutionFollowUpItem = async (historyId: string) => {
    try {
      if (!user?.id) {
        return;
      }

      const currentReview = executionReviewsByHistoryId.get(historyId);
      const now = new Date().toISOString();
      await saveExecutionFollowUpReviewsMutation.mutateAsync([
        buildExecutionFollowUpReviewPayload({
          historyId,
          currentReview,
          operatorName: currentReview?.operatorName ?? user.username,
          note: executionFollowUpNotes[historyId]?.trim() || currentReview?.note,
          status: "pending",
          assignmentReason: "Reopened execution follow-up item",
          reviewedAt: now,
        }),
      ]);
      toast({
        title: "Execution Reopened",
        description: "That execution follow-up item is back in the open recovery queue.",
      });
    } catch (error) {
      toast({
        title: "Execution Reopen Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkRecheckExecutionFollowUpItems = async () => {
    const selectedItems = filteredExecutionFollowUpItems.filter((item) =>
      selectedExecutionFollowUpHistoryIds.includes(item.historyId),
    );
    if (selectedItems.length === 0) {
      return;
    }

    try {
      await Promise.all(selectedItems.map((item) => recheckExecutionFollowUpItemMutation.mutateAsync(item.historyId)));
      setSelectedExecutionFollowUpHistoryIds([]);
      toast({
        title: "Execution Queue Rechecked",
        description: `${selectedItems.length} execution item${selectedItems.length === 1 ? "" : "s"} refreshed from stored lifecycle history.`,
      });
    } catch (error) {
      toast({
        title: "Bulk Recheck Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkTakeExecutionFollowUpOwnership = () => {
    if (!user?.id || selectedExecutionFollowUpHistoryIds.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveExecutionFollowUpReviewsMutation.mutate(
      filteredExecutionFollowUpItems
        .filter((item) => selectedExecutionFollowUpHistoryIds.includes(item.historyId))
        .map((item) =>
          buildExecutionFollowUpReviewPayload({
            historyId: item.historyId,
            currentReview: {
              historyId: item.historyId,
              status: item.reviewStatus ?? "pending",
              note: item.reviewNote,
              operatorName: item.operatorName,
              operatorHistory: item.operatorHistory,
              reviewedAt: item.reviewedAt,
            },
            operatorName: user.username,
            note: executionFollowUpNotes[item.historyId]?.trim() || item.reviewNote,
            status: item.reviewStatus ?? "pending",
            assignmentReason: item.operatorName
              ? "Reassigned execution follow-up ownership"
              : "Claimed execution follow-up",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedExecutionFollowUpHistoryIds([]);
  };

  const handleBulkReopenExecutionFollowUpItems = () => {
    if (!user?.id || selectedExecutionFollowUpHistoryIds.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    saveExecutionFollowUpReviewsMutation.mutate(
      filteredExecutionFollowUpItems
        .filter((item) => selectedExecutionFollowUpHistoryIds.includes(item.historyId))
        .map((item) =>
          buildExecutionFollowUpReviewPayload({
            historyId: item.historyId,
            currentReview: {
              historyId: item.historyId,
              status: item.reviewStatus ?? "pending",
              note: item.reviewNote,
              operatorName: item.operatorName,
              operatorHistory: item.operatorHistory,
              reviewedAt: item.reviewedAt,
            },
            operatorName: item.operatorName ?? user.username,
            note: executionFollowUpNotes[item.historyId]?.trim() || item.reviewNote,
            status: "pending",
            assignmentReason: "Reopened execution follow-up item",
            reviewedAt: now,
          }),
        ),
    );
    setSelectedExecutionFollowUpHistoryIds([]);
  };

  const handleBulkReviewExecutionFollowUpItems = async () => {
    if (!user?.id) {
      return;
    }

    const selectedItems = filteredExecutionFollowUpItems.filter(
      (item) =>
        selectedExecutionFollowUpHistoryIds.includes(item.historyId) &&
        item.category === "failed" &&
        item.reviewStatus !== "reviewed",
    );
    if (selectedItems.length === 0) {
      return;
    }

    try {
      const now = new Date().toISOString();
      await Promise.all(
        selectedItems.map((item) =>
          saveExecutionFollowUpReviewsMutation.mutateAsync([
            buildExecutionFollowUpReviewPayload({
              historyId: item.historyId,
              currentReview: {
                historyId: item.historyId,
                status: item.reviewStatus ?? "pending",
                note: item.reviewNote,
                operatorName: item.operatorName,
                operatorHistory: item.operatorHistory,
                reviewedAt: item.reviewedAt,
              },
              operatorName: item.operatorName ?? user.username,
              note: executionFollowUpNotes[item.historyId]?.trim() || item.reviewNote,
              status: "reviewed",
              assignmentReason: "Reviewed execution follow-up item",
              reviewedAt: now,
            }),
          ]),
        ),
      );
      setSelectedExecutionFollowUpHistoryIds([]);
      setExecutionFollowUpNotes((current) => {
        const next = { ...current };
        for (const item of selectedItems) {
          delete next[item.historyId];
        }
        return next;
      });
      toast({
        title: "Execution Failures Reviewed",
        description: `${selectedItems.length} failed execution item${selectedItems.length === 1 ? "" : "s"} marked reviewed.`,
      });
    } catch (error) {
      toast({
        title: "Bulk Review Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Execution feed</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Live Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live updates from copy groups, follower health, and execution flow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Copy Groups</p>
          <p className="mt-2 text-2xl font-semibold text-white">{groups.length}</p>
          <p className="mt-1 text-sm text-zinc-400">groups currently tracked on this page</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Recent Events</p>
          <p className="mt-2 text-2xl font-semibold text-white">{allActivity.length}</p>
          <p className="mt-1 text-sm text-zinc-400">latest updates loaded across all groups</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Notifications</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{unreadEstimate}</p>
          <p className="mt-1 text-sm text-zinc-400">operational alerts and follow-up items</p>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-rose-100">Alert Stories</p>
          <p className="mt-2 text-2xl font-semibold text-white">{copyGroupAlertStories.length}</p>
          <p className="mt-1 text-sm text-rose-100/80">shared copy-group alert stories feeding recovery work</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Sync Reviews</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-200">{reviewedSyncCount + simulatedSyncCount}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {reviewedSyncCount} reviewed, {simulatedSyncCount} simulated, {approvedSyncCount} approved, {handedOffSyncCount} handed off, and {completedManuallySyncCount} completed manually
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200">Shared Operator Work</p>
          <p className="mt-2 text-2xl font-semibold text-white">{operatorWorkSummary.overdue}</p>
          <p className="mt-1 text-sm text-amber-100">
            {operatorWorkSummary.headline}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">Ownership Gaps</p>
          <p className="mt-2 text-2xl font-semibold text-white">{operatorWorkSummary.unassigned}</p>
          <p className="mt-1 text-sm text-cyan-100">
            {operatorWorkSummary.detail}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-100">Sync Repair Plan</p>
          <p className="mt-2 text-2xl font-semibold text-white">{positionSyncRepairSummary.autoReadyCount}</p>
          <p className="mt-1 text-sm text-sky-100">
            {positionSyncRepairSummary.headline}. {positionSyncRepairSummary.detail}
          </p>
        </div>
      </div>

      <ActivityCopyGroupAlertBoard
        copyGroupAlertStories={copyGroupAlertStories}
        recentCopyGroupAlerts={recentCopyGroupAlerts}
        sortedCopyGroupAlertStories={sortedCopyGroupAlertStories}
        newCopyGroupAlertCount={newCopyGroupAlertCount}
        unownedCopyGroupAlertCount={unownedCopyGroupAlertCount}
        myCopyGroupAlertCount={myCopyGroupAlertCount}
        reviewedCopyGroupAlertCount={reviewedCopyGroupAlertCount}
        staleCopyGroupAlertCount={staleCopyGroupAlertCount}
        copyGroupAlertSearch={copyGroupAlertSearch}
        onCopyGroupAlertSearchChange={setCopyGroupAlertSearch}
        copyGroupAlertFilter={copyGroupAlertFilter}
        onCopyGroupAlertFilterChange={setCopyGroupAlertFilter}
        selectedCopyGroupAlertStoryKeys={selectedCopyGroupAlertStoryKeys}
        copyGroupAlertNotes={copyGroupAlertNotes}
        copyGroupAlertReviewsByStoryKey={copyGroupAlertReviewsByStoryKey}
        formatTimestamp={formatTimestamp}
        isSaving={saveCopyGroupAlertReviewsMutation.isPending}
        onToggleCopyGroupAlertSelection={handleToggleCopyGroupAlertSelection}
        onSelectAllVisibleCopyGroupAlerts={handleSelectAllVisibleCopyGroupAlerts}
        onSelectUnownedCopyGroupAlerts={handleSelectUnownedCopyGroupAlerts}
        onClearCopyGroupAlertSelection={handleClearCopyGroupAlertSelection}
        onBulkTakeCopyGroupAlertOwnership={handleBulkTakeCopyGroupAlertOwnership}
        onBulkAcknowledgeCopyGroupAlerts={handleBulkAcknowledgeCopyGroupAlerts}
        onCopyGroupAlertNoteChange={(storyKey, value) =>
          setCopyGroupAlertNotes((current) => ({
            ...current,
            [storyKey]: value,
          }))
        }
        onTakeCopyGroupAlertOwnership={handleTakeCopyGroupAlertOwnership}
        onAcknowledgeCopyGroupAlert={handleAcknowledgeCopyGroupAlert}
        onReopenCopyGroupAlert={handleReopenCopyGroupAlert}
        getCopyGroupAlertFreshnessLabel={getCopyGroupAlertFreshnessLabel}
      />

      <ActivityCopyGroupHealthBoard
        copyGroupPulse={copyGroupPulse}
        copyGroupHealthWatchlist={copyGroupHealthWatchlist}
        reviewedCopyGroupHealthCount={reviewedCopyGroupHealthCount}
        staleCopyGroupHealthReviewCount={staleCopyGroupHealthReviewCount}
        recurringCopyGroupHealthCount={recurringCopyGroupHealthCount}
        unreviewedCopyGroupHealthCount={unreviewedCopyGroupHealthCount}
        recoverNowCopyGroupHealthCount={recoverNowCopyGroupHealthCount}
        stabilizeSoonCopyGroupHealthCount={stabilizeSoonCopyGroupHealthCount}
        resumeCheckCopyGroupHealthCount={resumeCheckCopyGroupHealthCount}
        stageBeforeUseCopyGroupHealthCount={stageBeforeUseCopyGroupHealthCount}
        copyGroupHealthSearch={copyGroupHealthSearch}
        onCopyGroupHealthSearchChange={setCopyGroupHealthSearch}
        copyGroupHealthBoardView={copyGroupHealthBoardView}
        onCopyGroupHealthBoardViewChange={setCopyGroupHealthBoardView}
        copyGroupHealthReviewFilter={copyGroupHealthReviewFilter}
        onCopyGroupHealthReviewFilterChange={setCopyGroupHealthReviewFilter}
        copyGroupHealthRecoveryFilter={copyGroupHealthRecoveryFilter}
        onCopyGroupHealthRecoveryFilterChange={setCopyGroupHealthRecoveryFilter}
        sortedCopyGroupHealthEntries={sortedCopyGroupHealthEntries}
        recoverNowCopyGroupHealthEntries={recoverNowCopyGroupHealthEntries}
        selectedCopyGroupHealthGroupIds={selectedCopyGroupHealthGroupIds}
        copyGroupHealthReviews={copyGroupHealthReviews}
        copyGroupHealthNotes={copyGroupHealthNotes}
        copyGroupHealthBulkResultSummary={copyGroupHealthBulkResultSummary}
        formatTimestamp={formatTimestamp}
        buildCopyGroupHealthConcernSignature={buildCopyGroupHealthConcernSignature}
        countRecentMatchingHealthReviews={countRecentMatchingHealthReviews}
        onToggleCopyGroupHealthSelection={handleToggleCopyGroupHealthSelection}
        onSelectAllVisibleCopyGroupHealthEntries={handleSelectAllVisibleCopyGroupHealthEntries}
        onSelectAttentionCopyGroupHealthEntries={handleSelectAttentionCopyGroupHealthEntries}
        onSelectRecoverNowCopyGroupHealthEntries={handleSelectRecoverNowCopyGroupHealthEntries}
        onSelectStaleCopyGroupHealthEntries={handleSelectStaleCopyGroupHealthEntries}
        onClearCopyGroupHealthSelection={handleClearCopyGroupHealthSelection}
        onBulkClearCopyGroupHealthReviews={handleBulkClearCopyGroupHealthReviews}
        onBulkAcknowledgeCopyGroupHealthReviews={handleBulkAcknowledgeCopyGroupHealthReviews}
        onCopyGroupHealthNoteChange={(groupId, value) =>
          setCopyGroupHealthNotes((current) => ({
            ...current,
            [groupId]: value,
          }))
        }
        onAcknowledgeCopyGroupHealth={handleAcknowledgeCopyGroupHealth}
        onClearCopyGroupHealthReview={handleClearCopyGroupHealthReview}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-sm ${
            showReviewed
              ? "border-white/10 bg-white/[0.03] text-zinc-200"
              : "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
          }`}
          onClick={() => setShowReviewed((current) => !current)}
        >
          {showReviewed ? "Hide Reviewed" : "Show Reviewed"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {(error as Error).message}
        </div>
      ) : null}

      <ActivityRiskFollowUpBoard
        riskFollowUpSearch={riskFollowUpSearch}
        onRiskFollowUpSearchChange={setRiskFollowUpSearch}
        riskFollowUpFilter={riskFollowUpFilter}
        onRiskFollowUpFilterChange={setRiskFollowUpFilter}
        riskFollowUpItems={riskFollowUpItems}
        filteredRiskFollowUpItems={filteredRiskFollowUpItems}
        reviewedRiskFollowUpCount={reviewedRiskFollowUpCount}
        ownedRiskFollowUpCount={ownedRiskFollowUpCount}
        unownedRiskFollowUpCount={unownedRiskFollowUpCount}
        reassignedRiskFollowUpCount={reassignedRiskFollowUpCount}
        selectedRiskFollowUpAccountIds={selectedRiskFollowUpAccountIds}
        riskFollowUpNotes={riskFollowUpNotes}
        formatTimestamp={formatTimestamp}
        onToggleSelection={handleToggleRiskFollowUpSelection}
        onSelectVisible={handleSelectAllVisibleRiskFollowUpItems}
        onSelectUnowned={handleSelectUnownedRiskFollowUpItems}
        onClearSelection={handleClearRiskFollowUpSelection}
        onBulkTakeOwnership={handleBulkTakeRiskFollowUpOwnership}
        onBulkMarkReviewed={handleBulkMarkRiskFollowUpReviewed}
        onBulkReopen={handleBulkReopenRiskFollowUpItems}
        onNoteChange={(accountId, value) =>
          setRiskFollowUpNotes((current) => ({
            ...current,
            [accountId]: value,
          }))
        }
        onTakeOwnership={handleTakeRiskFollowUpOwnership}
        onSaveNote={handleSaveRiskFollowUpNote}
        onToggleReviewed={(accountId, reviewed) =>
          reviewed
            ? handleReopenRiskFollowUpItem(accountId)
            : handleMarkRiskFollowUpReviewed(accountId)
        }
      />

      <ActivityExecutionFollowUpBoard
        executionFollowUpSearch={executionFollowUpSearch}
        onExecutionFollowUpSearchChange={setExecutionFollowUpSearch}
        executionFollowUpFilter={executionFollowUpFilter}
        onExecutionFollowUpFilterChange={setExecutionFollowUpFilter}
        executionFollowUpItems={executionFollowUpItems}
        filteredExecutionFollowUpItems={filteredExecutionFollowUpItems}
        reviewedExecutionFollowUpCount={reviewedExecutionFollowUpCount}
        failedExecutionFollowUpCount={failedExecutionFollowUpCount}
        staleExecutionFollowUpCount={staleExecutionFollowUpCount}
        partialExecutionFollowUpCount={partialExecutionFollowUpCount}
        activeExecutionFollowUpCount={activeExecutionFollowUpCount}
        selectedExecutionFollowUpHistoryIds={selectedExecutionFollowUpHistoryIds}
        executionFollowUpNotes={executionFollowUpNotes}
        formatTimestamp={formatTimestamp}
        isRechecking={recheckExecutionFollowUpItemMutation.isPending}
        isSaving={saveExecutionFollowUpReviewsMutation.isPending}
        onToggleSelection={handleToggleExecutionFollowUpSelection}
        onSelectVisible={handleSelectAllVisibleExecutionFollowUpItems}
        onSelectFailed={handleSelectFailedExecutionFollowUpItems}
        onClearSelection={handleClearExecutionFollowUpSelection}
        onBulkTakeOwnership={handleBulkTakeExecutionFollowUpOwnership}
        onBulkRecheck={handleBulkRecheckExecutionFollowUpItems}
        onBulkReview={handleBulkReviewExecutionFollowUpItems}
        onBulkReopen={handleBulkReopenExecutionFollowUpItems}
        onNoteChange={(historyId, value) =>
          setExecutionFollowUpNotes((current) => ({
            ...current,
            [historyId]: value,
          }))
        }
        onTakeOwnership={handleTakeExecutionFollowUpOwnership}
        onSaveNote={handleSaveExecutionFollowUpNote}
        onRecheck={handleExecutionFollowUpRecheck}
        onToggleReviewed={(historyId, reviewed) =>
          reviewed
            ? handleReopenExecutionFollowUpItem(historyId)
            : handleExecutionFollowUpReview(historyId)
        }
      />

      <ActivityRithmicReadinessBoard
        rithmicReadinessSearch={rithmicReadinessSearch}
        onRithmicReadinessSearchChange={setRithmicReadinessSearch}
        rithmicReadinessFilter={rithmicReadinessFilter}
        onRithmicReadinessFilterChange={setRithmicReadinessFilter}
        rithmicReadinessItems={rithmicReadinessFollowUpItems}
        filteredRithmicReadinessItems={filteredRithmicReadinessFollowUpItems}
        reviewedRithmicReadinessCount={reviewedRithmicReadinessCount}
        ownedRithmicReadinessCount={ownedRithmicReadinessCount}
        unownedRithmicReadinessCount={unownedRithmicReadinessCount}
        reassignedRithmicReadinessCount={reassignedRithmicReadinessCount}
        selectedRithmicReadinessStoryKeys={selectedRithmicReadinessStoryKeys}
        rithmicReadinessNotes={rithmicReadinessNotes}
        formatTimestamp={formatTimestamp}
        isSaving={saveRithmicReadinessReviewsMutation.isPending}
        isRechecking={recheckRithmicReadinessMutation.isPending}
        recheckingAccountId={recheckRithmicReadinessMutation.variables}
        onToggleSelection={handleToggleRithmicReadinessSelection}
        onSelectVisible={handleSelectAllVisibleRithmicReadinessItems}
        onSelectUnowned={handleSelectUnownedRithmicReadinessItems}
        onClearSelection={handleClearRithmicReadinessSelection}
        onBulkTakeOwnership={handleBulkTakeRithmicReadinessOwnership}
        onBulkRecheck={handleBulkRecheckRithmicReadinessItems}
        onBulkMarkReviewed={handleBulkMarkRithmicReadinessReviewed}
        onBulkReopen={handleBulkReopenRithmicReadinessItems}
        onNoteChange={(storyKey, value) =>
          setRithmicReadinessNotes((current) => ({
            ...current,
            [storyKey]: value,
          }))
        }
        onTakeOwnership={handleTakeRithmicReadinessOwnership}
        onSaveNote={handleSaveRithmicReadinessNote}
        onRecheck={handleRithmicReadinessRecheck}
        onToggleReviewed={(storyKey, reviewed) =>
          reviewed
            ? handleReopenRithmicReadinessAlert(storyKey)
            : handleMarkRithmicReadinessReviewed(storyKey)
        }
      />

      <ActivityOperatorAuditBoard
        queueAuditFocus={queueAuditFocus}
        overdueSyncEntries={overdueSyncEntries}
        unassignedSyncEntries={unassignedSyncEntries}
        reassignedSyncEntries={reassignedSyncEntries}
        onSelectAuditFocus={handleSelectAuditFocus}
      />

      <ActivitySyncRepairBoard
        repairCandidateSearch={repairCandidateSearch}
        onRepairCandidateSearchChange={setRepairCandidateSearch}
        repairCandidateFilter={repairCandidateFilter}
        onRepairCandidateFilterChange={setRepairCandidateFilter}
        positionSyncRepairCandidates={positionSyncRepairCandidates}
        positionSyncRepairSummary={positionSyncRepairSummary}
        positionSyncRepairBoardSummary={positionSyncRepairBoardSummary}
        filteredRepairCandidates={filteredRepairCandidates}
        selectedRepairCandidateKeys={selectedRepairCandidateKeys}
        repairCandidateNotes={repairCandidateNotes}
        positionSyncWorkflowState={positionSyncWorkflowState}
        isSaving={savePositionSyncWorkflowMutation.isPending}
        formatTimestamp={formatTimestamp}
        onToggleSelection={handleToggleRepairCandidateSelection}
        onSelectVisible={handleSelectAllVisibleRepairCandidates}
        onSelectAutoReady={handleSelectAutoReadyRepairCandidates}
        onClearSelection={handleClearRepairCandidateSelection}
        onBulkReview={handleBulkReviewRepairCandidates}
        onBulkSimulate={handleBulkSimulateRepairCandidates}
        onBulkTakeOwnership={handleBulkTakeRepairCandidateOwnership}
        onBulkApprove={handleBulkApproveRepairCandidates}
        onRepairCandidateNoteChange={(key, value) =>
          setRepairCandidateNotes((current) => ({
            ...current,
            [key]: value,
          }))
        }
        onSaveNote={handleSaveRepairCandidateNote}
        onOpenInQueue={(entry) =>
          handleOpenRepairCandidateInQueue({
            ...entry,
            note: repairCandidateNotes[entry.key]?.trim() || positionSyncWorkflowState[entry.key]?.note,
          })
        }
      />

      <ActivitySyncReviewBoard
        queueSearch={queueSearch}
        onQueueSearchChange={setQueueSearch}
        syncQueueBoardView={syncQueueBoardView}
        onSyncQueueBoardViewChange={setSyncQueueBoardView}
        queueSort={queueSort}
        onQueueSortChange={setQueueSort}
        queueAuditFocus={queueAuditFocus}
        onClearQueueAuditFocus={() => setQueueAuditFocus("all")}
        queueFilter={queueFilter}
        onQueueFilterChange={setQueueFilter}
        positionSyncQueue={positionSyncQueue}
        sortedAuditFocusedQueue={sortedAuditFocusedQueue}
        reviewedSyncCount={reviewedSyncCount}
        simulatedSyncCount={simulatedSyncCount}
        approvedSyncCount={approvedSyncCount}
        handedOffSyncCount={handedOffSyncCount}
        completedManuallySyncCount={completedManuallySyncCount}
        assignmentReasons={assignmentReasons}
        isSaving={savePositionSyncWorkflowMutation.isPending}
        formatTimestamp={formatTimestamp}
        getPositionSyncStatusLabel={getPositionSyncStatusLabel}
        getPositionSyncStatusTone={getPositionSyncStatusTone}
        getPositionSyncStatusTimestamp={getPositionSyncStatusTimestamp}
        onAssignmentReasonChange={(key, value) =>
          setAssignmentReasons((current) => ({
            ...current,
            [key]: value,
          }))
        }
        onApprove={handleApproveSyncQueueEntry}
        onTakeOwnership={handleTakeOwnership}
        onHandOff={handleHandOffSyncQueueEntry}
        onComplete={handleCompleteSyncQueueEntry}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <LiveActivityFeed
          activities={
            isLoading
              ? []
              : clusteredNotifications.map((notification) => ({
                  id: notification.id,
                  timestamp: formatTimestamp(notification.timestamp),
                  message: describeActivityNotificationMessage(notification),
                  type: toActivityFeedType(notification),
                  relatedCount: notification.relatedCount,
                  relatedMessages:
                    notification.relatedItems.length > 0
                      ? notification.relatedItems.slice(0, 2).map((item) => describeActivityNotificationMessage(item))
                      : undefined,
                }))
          }
        />
        <LiveActivityFeed
          activities={
            isLoading
              ? []
              : allActivity.map((activity) => ({
                  id: activity.id,
                  timestamp: formatTimestamp(activity.timestamp),
                  message: `${activity.groupName}: ${activity.message}`,
                  type: activity.type,
                  relatedCount: activity.relatedCount,
                  relatedMessages: activity.relatedMessages?.map(
                    (message) => `${activity.groupName}: ${message}`,
                  ),
                }))
          }
        />
        <LiveActivityFeed
          activities={
            isLoading
              ? []
              : alertActivity.map((activity) => ({
                  id: activity.id,
                  timestamp: formatTimestamp(activity.timestamp),
                  message: `${activity.groupName}: ${activity.message}`,
                  type: activity.type,
                  relatedCount: activity.relatedCount,
                  relatedMessages: activity.relatedMessages?.map(
                    (message) => `${activity.groupName}: ${message}`,
                  ),
                }))
          }
        />
      </div>
    </div>
  );
}
