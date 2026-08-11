import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { LiveActivityFeed } from "@/components/live-activity-feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/user-context";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  buildAccountRiskFollowUpQueue,
  type AccountRiskFollowUpItem,
} from "@/lib/account-risk";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
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
  buildRiskNotificationFollowUpQueue,
  filterReviewedNotifications,
  toActivityFeedType,
} from "@/lib/notifications";
import {
  buildPositionSyncQueue,
  filterPositionSyncQueue,
  type PositionSyncQueueFilter,
} from "@/lib/position-sync-queue";
import {
  appendPositionSyncOperatorAssignment,
  toPositionSyncWorkflowState,
  type PositionSyncWorkflowSaveInput,
} from "@/lib/position-sync-workflow";
import type {
  AccountsRuntimeOverviewResponse,
  PositionSyncOverviewResponse,
} from "@/lib/runtime-overview";

interface ActivityPageData {
  groups: CopyGroup[];
  feed: ReturnType<typeof buildCopyGroupActivityFeed>;
  activityByGroupId: Record<string, CopyGroupSnapshotApiResponse["groups"][number]["activityPreview"]>;
}

type QueueSort = "recent" | "age" | "owner" | "reassignments";
type QueueAuditFocus = "all" | "overdue" | "unassigned" | "reassigned";
type CopyGroupHealthReviewFilter = "all" | "unreviewed" | "reviewed" | "stale" | "recurring";
type CopyGroupHealthBoardView = "compact" | "detailed";
type RiskFollowUpFilter = "all" | "open" | "reviewed" | "owned" | "unowned" | "reassigned";

const ACTIVITY_QUEUE_SORT_STORAGE_KEY = "propcopia.activity.queueSort";
const ACTIVITY_QUEUE_AUDIT_FOCUS_STORAGE_KEY = "propcopia.activity.queueAuditFocus";
const COPY_GROUP_HEALTH_REVIEW_STORAGE_KEY = "propcopia.activity.copyGroupHealthReviews";
const COPY_GROUP_HEALTH_BOARD_VIEW_STORAGE_KEY = "propcopia.activity.copyGroupHealthBoardView";

interface CopyGroupHealthReviewState {
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

interface RiskFollowUpOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

interface RiskFollowUpReviewEntry {
  accountId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: RiskFollowUpOperatorAssignment[];
  reviewedAt?: string;
}

function appendRiskFollowUpOperatorAssignment(
  history: RiskFollowUpOperatorAssignment[] | undefined,
  operatorName: string | undefined,
  assignedAt: string,
  reason?: string,
): RiskFollowUpOperatorAssignment[] | undefined {
  if (!operatorName) {
    return history;
  }

  const nextHistory = history ? [...history] : [];
  const previousAssignment = nextHistory[nextHistory.length - 1];

  if (previousAssignment?.operatorName === operatorName) {
    return nextHistory;
  }

  nextHistory.push({
    operatorName,
    assignedAt,
    reason,
  });

  return nextHistory;
}

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

function loadStoredQueueSort(): QueueSort {
  if (typeof window === "undefined") {
    return "recent";
  }

  const stored = window.localStorage.getItem(ACTIVITY_QUEUE_SORT_STORAGE_KEY);
  return stored === "age" || stored === "owner" || stored === "reassignments"
    ? stored
    : "recent";
}

function loadStoredQueueAuditFocus(): QueueAuditFocus {
  if (typeof window === "undefined") {
    return "all";
  }

  const stored = window.localStorage.getItem(ACTIVITY_QUEUE_AUDIT_FOCUS_STORAGE_KEY);
  return stored === "overdue" || stored === "unassigned" || stored === "reassigned"
    ? stored
    : "all";
}

function normalizeQueueSort(value?: string | null): QueueSort {
  return value === "age" || value === "owner" || value === "reassignments"
    ? value
    : "recent";
}

function normalizeQueueAuditFocus(value?: string | null): QueueAuditFocus {
  return value === "overdue" || value === "unassigned" || value === "reassigned"
    ? value
    : "all";
}

function loadCopyGroupHealthReviews(): Record<string, CopyGroupHealthReviewState> {
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

function loadStoredCopyGroupHealthBoardView(): CopyGroupHealthBoardView {
  if (typeof window === "undefined") {
    return "compact";
  }

  const stored = window.localStorage.getItem(COPY_GROUP_HEALTH_BOARD_VIEW_STORAGE_KEY);
  return stored === "detailed" ? "detailed" : "compact";
}

function normalizeCopyGroupHealthBoardView(value?: string | null): CopyGroupHealthBoardView {
  return value === "detailed" ? "detailed" : "compact";
}

function normalizeCopyGroupHealthReviewFilter(
  value?: string | null,
): CopyGroupHealthReviewFilter {
  return value === "unreviewed" ||
    value === "reviewed" ||
    value === "stale" ||
    value === "recurring"
    ? value
    : "all";
}

function parseCopyGroupHealthReviewsJson(
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

function buildCopyGroupHealthConcernSignature(entry: {
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

function countRecentMatchingHealthReviews(
  review: CopyGroupHealthReviewState | undefined,
  concernSignature: string,
  now = new Date(),
): number {
  if (!review?.history?.length) {
    return 0;
  }

  const cutoffMs = now.getTime() - 24 * 60 * 60 * 1000;

  return review.history.filter((item) => {
    if (item.concernSignature !== concernSignature) {
      return false;
    }

    const acknowledgedAtMs = new Date(item.acknowledgedAt).getTime();
    return !Number.isNaN(acknowledgedAtMs) && acknowledgedAtMs >= cutoffMs;
  }).length;
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
    refetchInterval: LIVE_QUERY_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: notificationsData } = useNotifications();
  const { data: positionSyncWorkflowData } = useQuery<{
    success: boolean;
    reviews: PositionSyncWorkflowSaveInput[];
  } | null>({
    queryKey: user?.id ? ["/api/position-sync/reviews", user.id] : ["/api/position-sync/reviews", "anonymous"],
    queryFn: async ({ queryKey }) => getJson(queryKey[0] as string),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: positionSyncPlansData } = useQuery<PositionSyncOverviewResponse | null>({
    queryKey: user?.id ? ["/api/position-sync/plans", user.id] : ["/api/position-sync/plans", "anonymous"],
    queryFn: async ({ queryKey }) => getJson(queryKey[0] as string),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: accountsOverviewData } = useQuery<AccountsRuntimeOverviewResponse | null>({
    queryKey: user?.id ? ["/api/runtime/accounts-overview", user.id] : ["/api/runtime/accounts-overview", "anonymous"],
    queryFn: async ({ queryKey }) => getJson(queryKey[0] as string),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: riskFollowUpReviewData } = useQuery<{
    success: boolean;
    reviews: RiskFollowUpReviewEntry[];
  } | null>({
    queryKey: user?.id ? ["/api/risk-follow-up/reviews", user.id] : ["/api/risk-follow-up/reviews", "anonymous"],
    queryFn: async ({ queryKey }) => getJson(queryKey[0] as string),
    enabled: !!user?.id,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const [showReviewed, setShowReviewed] = useState(true);
  const [queueFilter, setQueueFilter] = useState<PositionSyncQueueFilter>("all");
  const [queueSearch, setQueueSearch] = useState("");
  const [assignmentReasons, setAssignmentReasons] = useState<Record<string, string>>({});
  const [queueAuditFocus, setQueueAuditFocus] = useState<QueueAuditFocus>(loadStoredQueueAuditFocus);
  const [queueSort, setQueueSort] = useState<QueueSort>(loadStoredQueueSort);
  const [activityPreferencesHydrated, setActivityPreferencesHydrated] = useState(false);
  const [copyGroupHealthReviews, setCopyGroupHealthReviews] = useState<Record<string, CopyGroupHealthReviewState>>(
    loadCopyGroupHealthReviews,
  );
  const [copyGroupHealthNotes, setCopyGroupHealthNotes] = useState<Record<string, string>>({});
  const [copyGroupHealthReviewFilter, setCopyGroupHealthReviewFilter] =
    useState<CopyGroupHealthReviewFilter>("all");
  const [copyGroupHealthBoardView, setCopyGroupHealthBoardView] =
    useState<CopyGroupHealthBoardView>(loadStoredCopyGroupHealthBoardView);
  const [copyGroupHealthSearch, setCopyGroupHealthSearch] = useState("");
  const [selectedCopyGroupHealthGroupIds, setSelectedCopyGroupHealthGroupIds] = useState<string[]>([]);
  const [copyGroupHealthPreferencesHydrated, setCopyGroupHealthPreferencesHydrated] = useState(false);
  const [riskFollowUpSearch, setRiskFollowUpSearch] = useState("");
  const [riskFollowUpNotes, setRiskFollowUpNotes] = useState<Record<string, string>>({});
  const [riskFollowUpFilter, setRiskFollowUpFilter] = useState<RiskFollowUpFilter>("all");
  const [selectedRiskFollowUpAccountIds, setSelectedRiskFollowUpAccountIds] = useState<string[]>([]);

  useEffect(() => {
    setShowReviewed(user?.showReviewedNotifications ?? true);
  }, [user?.showReviewedNotifications]);

  useEffect(() => {
    if (!user?.id) {
      setActivityPreferencesHydrated(false);
      return;
    }

    setQueueSort(normalizeQueueSort(user.activityQueueSort));
    setQueueAuditFocus(normalizeQueueAuditFocus(user.activityQueueAuditFocus));
    setActivityPreferencesHydrated(true);
  }, [user?.activityQueueAuditFocus, user?.activityQueueSort, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCopyGroupHealthPreferencesHydrated(false);
      return;
    }

    setCopyGroupHealthReviewFilter(
      normalizeCopyGroupHealthReviewFilter(user.copyGroupHealthReviewFilter),
    );
    setCopyGroupHealthReviews(
      parseCopyGroupHealthReviewsJson(user.copyGroupHealthReviewsJson),
    );
    setCopyGroupHealthPreferencesHydrated(true);
  }, [
    user?.copyGroupHealthReviewFilter,
    user?.copyGroupHealthReviewsJson,
    user?.id,
  ]);

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

  const groups = data?.groups ?? [];
  const copyGroupOverview = summarizeCopyGroups(groups);
  const copyGroupPulse = describeCopyGroupPulse(copyGroupOverview);
  const copyGroupHealthWatchlist = buildCopyGroupHealthWatchlist(
    groups,
    data?.activityByGroupId ?? {},
  );
  const allActivity = clusterCopyGroupActivityFeed(data?.feed ?? []);
  const alertActivity = filterCopyGroupActivityFeed(allActivity, "alerts");
  const notifications = filterReviewedNotifications(
    notificationsData?.notifications ?? [],
    showReviewed,
  );
  const clusteredNotifications = clusterNotifications(notifications);
  const unreadEstimate = notificationsData?.unreadEstimate ?? 0;
  const accountRiskFollowUpItems = buildAccountRiskFollowUpQueue(
    accountsOverviewData?.accountRiskOverview.accounts ?? [],
  );
  const riskNotificationFollowUpItems = buildRiskNotificationFollowUpQueue(notificationsData?.notifications ?? []);
  const riskFollowUpItems = accountRiskFollowUpItems.map((item) => {
    const matchingNotification = riskNotificationFollowUpItems.find((notification) => notification.id === item.accountId || notification.id.includes(item.accountId));
    const review = (riskFollowUpReviewData?.reviews ?? []).find((entry) => entry.accountId === item.accountId);

    return {
      ...item,
      notificationId: matchingNotification?.id ?? item.accountId,
      notificationTimestamp: matchingNotification?.timestamp,
      review,
    };
  });
  const filteredRiskFollowUpItems = riskFollowUpItems.filter((item) => {
    if (riskFollowUpFilter === "open" && item.review?.status === "reviewed") {
      return false;
    }

    if (riskFollowUpFilter === "reviewed" && item.review?.status !== "reviewed") {
      return false;
    }

    if (riskFollowUpFilter === "owned" && !item.review?.operatorName) {
      return false;
    }

    if (riskFollowUpFilter === "unowned" && item.review?.operatorName) {
      return false;
    }

    if (riskFollowUpFilter === "reassigned" && (item.review?.operatorHistory?.length ?? 0) <= 1) {
      return false;
    }

    const search = riskFollowUpSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return [
      item.accountName,
      item.headline,
      item.detail,
      item.recommendedAction,
      item.review?.operatorName,
      item.review?.note,
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
  const reviewedRiskFollowUpCount = riskFollowUpItems.filter((item) => item.review?.status === "reviewed").length;
  const ownedRiskFollowUpCount = riskFollowUpItems.filter((item) => !!item.review?.operatorName).length;
  const unownedRiskFollowUpCount = riskFollowUpItems.filter((item) => !item.review?.operatorName).length;
  const reassignedRiskFollowUpCount = riskFollowUpItems.filter(
    (item) => (item.review?.operatorHistory?.length ?? 0) > 1,
  ).length;
  const reviewedCopyGroupHealthCount = copyGroupHealthWatchlist.entries.filter(
    (entry) => !!copyGroupHealthReviews[entry.groupId],
  ).length;
  const staleCopyGroupHealthReviewCount = copyGroupHealthWatchlist.entries.filter((entry) => {
    const storedReview = copyGroupHealthReviews[entry.groupId];
    if (!storedReview) {
      return false;
    }

    return storedReview.concernSignature !== buildCopyGroupHealthConcernSignature(entry);
  }).length;
  const unreviewedCopyGroupHealthCount = copyGroupHealthWatchlist.entries.filter((entry) => {
    const storedReview = copyGroupHealthReviews[entry.groupId];
    if (!storedReview) {
      return true;
    }

    return storedReview.concernSignature !== buildCopyGroupHealthConcernSignature(entry);
  }).length;
  const recurringCopyGroupHealthCount = copyGroupHealthWatchlist.entries.filter((entry) => {
    const review = copyGroupHealthReviews[entry.groupId];
    return countRecentMatchingHealthReviews(
      review,
      buildCopyGroupHealthConcernSignature(entry),
    ) >= 2;
  }).length;
  const filteredCopyGroupHealthEntries = copyGroupHealthWatchlist.entries.filter((entry) => {
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
      entry.lastStableSignalLabel,
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
  const positionSyncWorkflowState = positionSyncWorkflowData?.reviews
    ? toPositionSyncWorkflowState(positionSyncWorkflowData.reviews)
    : {};
  const positionSyncQueue = buildPositionSyncQueue(
    positionSyncPlansData,
    positionSyncWorkflowData?.reviews ?? [],
  );
  const filteredPositionSyncQueue = filterPositionSyncQueue(
    positionSyncQueue,
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
    if (queueSort === "age") {
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

    return right.ageMinutes - left.ageMinutes;
  });
  const overdueSyncEntries = positionSyncQueue.filter((entry) => entry.needsAttention);
  const unassignedSyncEntries = positionSyncQueue.filter(
    (entry) =>
      (entry.status === "approved" || entry.status === "handed_off") &&
      !entry.operatorName,
  );
  const reassignedSyncEntries = positionSyncQueue.filter(
    (entry) => entry.reassignmentCount > 0,
  );
  const attentionSyncCount = positionSyncQueue.filter((entry) => entry.needsAttention).length;
  const unassignedSyncCount = positionSyncQueue.filter(
    (entry) =>
      (entry.status === "approved" || entry.status === "handed_off") &&
      !entry.operatorName,
  ).length;
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

  const handleAcknowledgeCopyGroupHealth = (groupId: string) => {
    const entry = copyGroupHealthWatchlist.entries.find((item) => item.groupId === groupId);
    if (!entry) {
      return;
    }

    setCopyGroupHealthReviews((current) => ({
      ...current,
      [groupId]: {
        acknowledgedAt: new Date().toISOString(),
        note: copyGroupHealthNotes[groupId]?.trim() ?? "",
        concernSignature: buildCopyGroupHealthConcernSignature(entry),
        reviewedBy: user?.username ?? "Operator",
        history: [
          {
            acknowledgedAt: new Date().toISOString(),
            note: copyGroupHealthNotes[groupId]?.trim() ?? "",
            concernSignature: buildCopyGroupHealthConcernSignature(entry),
            reviewedBy: user?.username ?? "Operator",
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
    setCopyGroupHealthReviews((current) => {
      const next = { ...current };
      for (const groupId of selectedCopyGroupHealthGroupIds) {
        delete next[groupId];
      }
      return next;
    });
    setSelectedCopyGroupHealthGroupIds([]);
  };

  const handleBulkAcknowledgeCopyGroupHealthReviews = () => {
    const selectedIds = new Set(selectedCopyGroupHealthGroupIds);
    const now = new Date().toISOString();

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
          reviewedBy: user?.username ?? "Operator",
          history: [
            {
              acknowledgedAt: now,
              note: copyGroupHealthNotes[entry.groupId]?.trim() ?? "",
              concernSignature: buildCopyGroupHealthConcernSignature(entry),
              reviewedBy: user?.username ?? "Operator",
            },
            ...(current[entry.groupId]?.history ?? []),
          ].slice(0, 5),
        };
      }

      return next;
    });

    setSelectedCopyGroupHealthGroupIds([]);
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
        user?.id ? ["/api/position-sync/reviews", user.id] : ["/api/position-sync/reviews", "anonymous"],
        result,
      );
      const latestStatus = reviews[0]?.status;
      toast({
        title: "Sync Workflow Updated",
        description: latestStatus
          ? `${getPositionSyncStatusLabel(latestStatus)} status saved for ${reviews.length} sync item${reviews.length === 1 ? "" : "s"}.`
          : "Sync workflow status saved.",
      });
    },
  });
  const saveRiskFollowUpReviewsMutation = useMutation({
    mutationFn: async (reviews: RiskFollowUpReviewEntry[]) => {
      const response = await apiRequest("POST", "/api/risk-follow-up/reviews", {
        reviews,
      });
      return response.json() as Promise<{
        success: boolean;
        reviews: RiskFollowUpReviewEntry[];
      }>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        user?.id ? ["/api/risk-follow-up/reviews", user.id] : ["/api/risk-follow-up/reviews", "anonymous"],
        result,
      );
      toast({
        title: "Risk Queue Updated",
        description: "Shared risk follow-up ownership and review state saved.",
      });
    },
  });

  const handleTakeRiskFollowUpOwnership = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((entry) => entry.accountId === accountId);
    const now = new Date().toISOString();

    saveRiskFollowUpReviewsMutation.mutate([
      {
        accountId,
        status: currentReview?.status ?? "pending",
        note: riskFollowUpNotes[accountId]?.trim() || currentReview?.note,
        operatorName: user.username,
        operatorHistory: appendRiskFollowUpOperatorAssignment(
          currentReview?.operatorHistory,
          user.username,
          now,
          currentReview?.operatorName
            ? "Reassigned risk follow-up ownership"
            : "Claimed unassigned risk follow-up",
        ),
        reviewedAt: currentReview?.reviewedAt,
      },
    ]);
  };

  const handleSaveRiskFollowUpNote = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((entry) => entry.accountId === accountId);
    saveRiskFollowUpReviewsMutation.mutate([
      {
        accountId,
        status: currentReview?.status ?? "pending",
        note: riskFollowUpNotes[accountId]?.trim() || undefined,
        operatorName: currentReview?.operatorName ?? user.username,
        operatorHistory: currentReview?.operatorHistory,
        reviewedAt: currentReview?.reviewedAt,
      },
    ]);
  };

  const handleMarkRiskFollowUpReviewed = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((entry) => entry.accountId === accountId);
    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate([
      {
        accountId,
        status: "reviewed",
        note: riskFollowUpNotes[accountId]?.trim() || currentReview?.note,
        operatorName: currentReview?.operatorName ?? user.username,
        operatorHistory: appendRiskFollowUpOperatorAssignment(
          currentReview?.operatorHistory,
          currentReview?.operatorName ?? user.username,
          now,
          "Reviewed risk follow-up item",
        ),
        reviewedAt: now,
      },
    ]);
  };

  const handleReopenRiskFollowUpItem = (accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((entry) => entry.accountId === accountId);
    const now = new Date().toISOString();
    saveRiskFollowUpReviewsMutation.mutate([
      {
        accountId,
        status: "pending",
        note: riskFollowUpNotes[accountId]?.trim() || currentReview?.note,
        operatorName: currentReview?.operatorName ?? user.username,
        operatorHistory: appendRiskFollowUpOperatorAssignment(
          currentReview?.operatorHistory,
          user.username,
          now,
          "Reopened risk follow-up item",
        ),
      },
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
        .map((item) => ({
          accountId: item.accountId,
          status: item.review?.status ?? "pending",
          note: riskFollowUpNotes[item.accountId]?.trim() || item.review?.note,
          operatorName: user.username,
          operatorHistory: appendRiskFollowUpOperatorAssignment(
            item.review?.operatorHistory,
            user.username,
            now,
            item.review?.operatorName
              ? "Reassigned risk follow-up ownership"
              : "Claimed unassigned risk follow-up",
          ),
          reviewedAt: item.review?.reviewedAt,
        })),
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
        .map((item) => ({
          accountId: item.accountId,
          status: "reviewed",
          note: riskFollowUpNotes[item.accountId]?.trim() || item.review?.note,
          operatorName: item.review?.operatorName ?? user.username,
          operatorHistory: appendRiskFollowUpOperatorAssignment(
            item.review?.operatorHistory,
            item.review?.operatorName ?? user.username,
            now,
            "Reviewed risk follow-up item",
          ),
          reviewedAt: now,
        })),
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
        .map((item) => ({
          accountId: item.accountId,
          status: "pending",
          note: riskFollowUpNotes[item.accountId]?.trim() || item.review?.note,
          operatorName: item.review?.operatorName ?? user.username,
          operatorHistory: appendRiskFollowUpOperatorAssignment(
            item.review?.operatorHistory,
            user.username,
            now,
            "Reopened risk follow-up item",
          ),
        })),
    );
    setSelectedRiskFollowUpAccountIds([]);
  };

  useEffect(() => {
    if (!user?.id || !activityPreferencesHydrated) {
      return;
    }

    const persistedQueueSort = normalizeQueueSort(user.activityQueueSort);
    const persistedQueueAuditFocus = normalizeQueueAuditFocus(user.activityQueueAuditFocus);

    if (
      queueSort === persistedQueueSort &&
      queueAuditFocus === persistedQueueAuditFocus
    ) {
      return;
    }

    saveActivityPreferencesMutation.mutate({
      activityQueueSort: queueSort,
      activityQueueAuditFocus: queueAuditFocus,
    });
  }, [
    activityPreferencesHydrated,
    queueAuditFocus,
    queueSort,
    saveActivityPreferencesMutation,
    user?.activityQueueAuditFocus,
    user?.activityQueueSort,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id || !copyGroupHealthPreferencesHydrated) {
      return;
    }

    const persistedFilter = normalizeCopyGroupHealthReviewFilter(
      user.copyGroupHealthReviewFilter,
    );
    const persistedReviewsJson = user.copyGroupHealthReviewsJson ?? null;
    const nextReviewsJson = JSON.stringify(copyGroupHealthReviews);

    if (
      copyGroupHealthReviewFilter === persistedFilter &&
      nextReviewsJson === (persistedReviewsJson ?? "{}")
    ) {
      return;
    }

    saveActivityPreferencesMutation.mutate({
      copyGroupHealthReviewFilter,
      copyGroupHealthReviewsJson: nextReviewsJson,
    });
  }, [
    copyGroupHealthPreferencesHydrated,
    copyGroupHealthReviewFilter,
    copyGroupHealthReviews,
    saveActivityPreferencesMutation,
    user?.copyGroupHealthReviewFilter,
    user?.copyGroupHealthReviewsJson,
    user?.id,
  ]);

  const handleApproveSyncQueueEntry = (entry: (typeof filteredPositionSyncQueue)[number]) => {
    savePositionSyncWorkflowMutation.mutate([
      {
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        status: "approved",
        note: entry.note,
        operatorName: entry.operatorName,
        reviewedAt: entry.reviewedAt,
        simulatedAt: entry.simulatedAt,
        approvedAt: new Date().toISOString(),
      },
    ]);
  };

  const handleHandOffSyncQueueEntry = (entry: (typeof filteredPositionSyncQueue)[number]) => {
    const handedOffAt = new Date().toISOString();
    const reason =
      assignmentReasons[entry.key]?.trim() ||
      "Assigned for manual execution";
    savePositionSyncWorkflowMutation.mutate([
      {
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        status: "handed_off",
        note: entry.note,
        operatorName: user?.username,
        operatorHistory: appendPositionSyncOperatorAssignment(
          entry.operatorHistory,
          user?.username,
          handedOffAt,
          reason,
        ),
        reviewedAt: entry.reviewedAt,
        simulatedAt: entry.simulatedAt,
        approvedAt: entry.approvedAt,
        handedOffAt,
      },
    ]);
  };

  const handleCompleteSyncQueueEntry = (entry: (typeof filteredPositionSyncQueue)[number]) => {
    const completedManuallyAt = new Date().toISOString();
    const reason =
      assignmentReasons[entry.key]?.trim() ||
      "Completed manual follow-through";
    savePositionSyncWorkflowMutation.mutate([
      {
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        status: "completed_manually",
        note: entry.note,
        operatorName: user?.username ?? entry.operatorName,
        operatorHistory: appendPositionSyncOperatorAssignment(
          entry.operatorHistory,
          user?.username ?? entry.operatorName,
          completedManuallyAt,
          reason,
        ),
        reviewedAt: entry.reviewedAt,
        simulatedAt: entry.simulatedAt,
        approvedAt: entry.approvedAt,
        handedOffAt: entry.handedOffAt,
        completedManuallyAt,
      },
    ]);
  };

  const handleTakeOwnership = (entry: (typeof filteredPositionSyncQueue)[number]) => {
    const reason =
      assignmentReasons[entry.key]?.trim() ||
      (entry.operatorName ? "Reassigned ownership" : "Claimed unassigned follow-up");
    savePositionSyncWorkflowMutation.mutate([
      {
        groupId: entry.groupId,
        followerAccountId: entry.followerAccountId,
        status: entry.status,
        note: entry.note,
        operatorName: user?.username,
        operatorHistory: appendPositionSyncOperatorAssignment(
          entry.operatorHistory,
          user?.username,
          new Date().toISOString(),
          reason,
        ),
        reviewedAt: entry.reviewedAt,
        simulatedAt: entry.simulatedAt,
        approvedAt: entry.approvedAt,
        handedOffAt: entry.handedOffAt,
        completedManuallyAt: entry.completedManuallyAt,
      },
    ]);
  };

  const handleSelectAuditFocus = (
    nextFocus: "all" | "overdue" | "unassigned" | "reassigned",
    nextFilter: PositionSyncQueueFilter = "all",
  ) => {
    setQueueAuditFocus(nextFocus);
    setQueueFilter(nextFilter);
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Sync Reviews</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-200">{reviewedSyncCount + simulatedSyncCount}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {reviewedSyncCount} reviewed, {simulatedSyncCount} simulated, {approvedSyncCount} approved, {handedOffSyncCount} handed off, and {completedManuallySyncCount} completed manually
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200">Needs Follow-Up</p>
          <p className="mt-2 text-2xl font-semibold text-white">{attentionSyncCount}</p>
          <p className="mt-1 text-sm text-amber-100">
            Approved or handed-off sync items that have been waiting more than 30 minutes
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">Unassigned Follow-Up</p>
          <p className="mt-2 text-2xl font-semibold text-white">{unassignedSyncCount}</p>
          <p className="mt-1 text-sm text-cyan-100">
            Approved or handed-off sync items that still do not have an operator owner
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Copy Group Health</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Operational watchlist</h2>
            <p className="mt-1 text-sm text-zinc-400">{copyGroupPulse.detail}</p>
          </div>
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              copyGroupPulse.tone === "danger"
                ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
                : copyGroupPulse.tone === "warn"
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                  : copyGroupPulse.tone === "muted"
                    ? "border-white/10 bg-white/[0.03] text-zinc-300"
                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
            }`}
          >
            {copyGroupPulse.headline}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-rose-200">Needs Attention</p>
            <p className="mt-2 text-2xl font-semibold text-white">{copyGroupHealthWatchlist.counts.attention}</p>
            <p className="mt-1 text-sm text-rose-100/80">Unhealthy or emergency-stopped groups</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200">On Watch</p>
            <p className="mt-2 text-2xl font-semibold text-white">{copyGroupHealthWatchlist.counts.degraded}</p>
            <p className="mt-1 text-sm text-amber-100/80">Degraded groups or follower readiness drift</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Paused</p>
            <p className="mt-2 text-2xl font-semibold text-white">{copyGroupHealthWatchlist.counts.paused}</p>
            <p className="mt-1 text-sm text-zinc-400">Groups not actively routing right now</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">Reviewed</p>
            <p className="mt-2 text-2xl font-semibold text-white">{reviewedCopyGroupHealthCount}</p>
            <p className="mt-1 text-sm text-emerald-100/80">Groups already acknowledged by the operator</p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100">Stale Reviews</p>
            <p className="mt-2 text-2xl font-semibold text-white">{staleCopyGroupHealthReviewCount}</p>
            <p className="mt-1 text-sm text-amber-100/80">Acknowledgements that no longer match the current issue</p>
          </div>
          <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-violet-100">Recurring Groups</p>
            <p className="mt-2 text-2xl font-semibold text-white">{recurringCopyGroupHealthCount}</p>
            <p className="mt-1 text-sm text-violet-100/80">Groups reviewed multiple times for the same issue in the last 24 hours</p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">Followers Offline</p>
            <p className="mt-2 text-2xl font-semibold text-white">{copyGroupHealthWatchlist.counts.disconnectedFollowers}</p>
            <p className="mt-1 text-sm text-cyan-100/80">Follower connections not ready across all groups</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Input
            value={copyGroupHealthSearch}
            onChange={(event) => setCopyGroupHealthSearch(event.target.value)}
            placeholder="Search groups, issues, notes, or reviewers"
            className="min-w-[280px] border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
          />
          {(["compact", "detailed"] as const).map((view) => (
            <button
              key={view}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm ${
                copyGroupHealthBoardView === view
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-200"
              }`}
              onClick={() =>
                setCopyGroupHealthBoardView(
                  normalizeCopyGroupHealthBoardView(view),
                )
              }
            >
              {view === "compact" ? "Compact view" : "Detailed view"}
            </button>
          ))}
          {sortedCopyGroupHealthEntries.length > 0 && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                onClick={handleSelectAllVisibleCopyGroupHealthEntries}
              >
                Select visible
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                onClick={handleSelectStaleCopyGroupHealthEntries}
              >
                Select stale only
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                onClick={handleClearCopyGroupHealthSelection}
                disabled={selectedCopyGroupHealthGroupIds.length === 0}
              >
                Clear selection
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                onClick={handleBulkAcknowledgeCopyGroupHealthReviews}
                disabled={selectedCopyGroupHealthGroupIds.length === 0}
              >
                Re-acknowledge selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                onClick={handleBulkClearCopyGroupHealthReviews}
                disabled={selectedCopyGroupHealthGroupIds.length === 0}
              >
                Clear selected reviews
              </Button>
            </>
          )}
          {(["all", "unreviewed", "reviewed", "stale", "recurring"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm ${
                copyGroupHealthReviewFilter === filter
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-200"
              }`}
              onClick={() => setCopyGroupHealthReviewFilter(filter)}
            >
              {filter === "all"
                ? `All (${copyGroupHealthWatchlist.entries.length})`
                : filter === "unreviewed"
                  ? `Unreviewed (${unreviewedCopyGroupHealthCount})`
                  : filter === "reviewed"
                    ? `Reviewed (${reviewedCopyGroupHealthCount - staleCopyGroupHealthReviewCount})`
                    : filter === "stale"
                      ? `Stale Reviews (${staleCopyGroupHealthReviewCount})`
                      : `Recurring (${recurringCopyGroupHealthCount})`}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {sortedCopyGroupHealthEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-3">
              No copy groups match the current review filter right now.
            </div>
          ) : (
            sortedCopyGroupHealthEntries.slice(0, 6).map((entry) => {
              const review = copyGroupHealthReviews[entry.groupId];
              const concernSignature = buildCopyGroupHealthConcernSignature(entry);
              const reviewIsStale =
                !!review &&
                review.concernSignature !== concernSignature;
              const repeatedReviewCount = countRecentMatchingHealthReviews(
                review,
                concernSignature,
              );

              return (
              <div key={entry.groupId} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={selectedCopyGroupHealthGroupIds.includes(entry.groupId)}
                      onChange={() => handleToggleCopyGroupHealthSelection(entry.groupId)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    Select
                  </label>
                </div>
                {review ? (
                  <div
                    className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
                      reviewIsStale
                        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    }`}
                  >
                    {reviewIsStale ? "Review needs refresh." : "Reviewed on "}
                    {!reviewIsStale ? formatTimestamp(review.acknowledgedAt) : " The current issue changed after acknowledgement."}
                    {review.note ? ` - ${review.note}` : ""}
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.followerReadinessLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {repeatedReviewCount >= 2 && (
                      <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1 text-xs text-violet-100">
                        Reviewed {repeatedReviewCount} times in 24h
                      </span>
                    )}
                    {copyGroupHealthReviews[entry.groupId] &&
                      copyGroupHealthReviews[entry.groupId].concernSignature !==
                        concernSignature && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                          Review stale
                        </span>
                      )}
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        entry.tone === "danger"
                          ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                          : entry.tone === "warn"
                            ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                            : "border-white/10 bg-white/[0.03] text-zinc-300"
                      }`}
                    >
                      {entry.concernLabel}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-300">{entry.detail}</p>
                {copyGroupHealthBoardView === "detailed" ? (
                  <>
                    {entry.latestRecoveryActionLabel && (
                      <p className="mt-3 text-xs text-cyan-200">
                        Latest recovery action: {entry.latestRecoveryActionLabel}
                      </p>
                    )}
                    {entry.lastStableSignalLabel && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {entry.lastStableSignalLabel}
                      </p>
                    )}
                    {entry.timeInConcernStateLabel && (
                      <p className="mt-2 text-xs text-amber-100/90">
                        Time in current warning state: {entry.timeInConcernStateLabel}
                      </p>
                    )}
                    {copyGroupHealthReviews[entry.groupId] && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>
                          Last touched by: {copyGroupHealthReviews[entry.groupId].reviewedBy ?? "Operator"}
                        </span>
                        <span>
                          Last reviewed at: {formatTimestamp(copyGroupHealthReviews[entry.groupId].acknowledgedAt)}
                        </span>
                      </div>
                    )}
                    {(copyGroupHealthReviews[entry.groupId]?.history?.length ?? 0) > 0 && (
                      <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                          Review Timeline
                        </p>
                        <div className="mt-2 space-y-2">
                          {copyGroupHealthReviews[entry.groupId].history?.slice(0, 3).map((reviewStamp, index) => (
                            <div
                              key={`${entry.groupId}-review-history-${index}`}
                              className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                            >
                              <p className="text-zinc-200">
                                {reviewStamp.reviewedBy ?? "Operator"} on {formatTimestamp(reviewStamp.acknowledgedAt)}
                              </p>
                              {reviewStamp.note && (
                                <p className="mt-1 text-zinc-500">{reviewStamp.note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    Compact view keeps the watchlist focused. Switch to detailed view for recovery context and review history.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>Runtime: {entry.status.replaceAll("_", " ")}</span>
                  <span>Health: {entry.healthStatus}</span>
                </div>
                <Input
                  value={copyGroupHealthNotes[entry.groupId] ?? copyGroupHealthReviews[entry.groupId]?.note ?? ""}
                  onChange={(event) =>
                    setCopyGroupHealthNotes((current) => ({
                      ...current,
                      [entry.groupId]: event.target.value,
                    }))
                  }
                  placeholder="Operator note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    onClick={() => handleAcknowledgeCopyGroupHealth(entry.groupId)}
                  >
                    {copyGroupHealthReviews[entry.groupId] ? "Update review" : "Acknowledge"}
                  </Button>
                  {copyGroupHealthReviews[entry.groupId] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                      onClick={() => handleClearCopyGroupHealthReview(entry.groupId)}
                    >
                      Clear review
                    </Button>
                  )}
                </div>
              </div>
            )})
          )}
        </div>
      </div>

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

      <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,22,0.98),rgba(8,10,16,0.98))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Risk Follow-Up</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Shared risk review queue</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Work breached, warning, and pending-risk accounts with shared ownership and review notes.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:w-[360px]">
            <Input
              value={riskFollowUpSearch}
              onChange={(event) => setRiskFollowUpSearch(event.target.value)}
              placeholder="Search by account, issue, owner, or note"
              className="border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
                Reviewed {reviewedRiskFollowUpCount}
              </span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                Owned {ownedRiskFollowUpCount}
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                Unowned {unownedRiskFollowUpCount}
              </span>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-100">
                Reassigned {reassignedRiskFollowUpCount}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="xl:col-span-2 flex flex-wrap gap-2">
            {(["all", "open", "reviewed", "owned", "unowned", "reassigned"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  riskFollowUpFilter === filter
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-200"
                }`}
                onClick={() => setRiskFollowUpFilter(filter)}
              >
                {filter === "all"
                  ? `All (${riskFollowUpItems.length})`
                  : filter === "open"
                    ? `Open (${riskFollowUpItems.length - reviewedRiskFollowUpCount})`
                    : filter === "reviewed"
                      ? `Reviewed (${reviewedRiskFollowUpCount})`
                      : filter === "owned"
                        ? `Owned (${ownedRiskFollowUpCount})`
                        : filter === "unowned"
                          ? `Unowned (${unownedRiskFollowUpCount})`
                          : `Reassigned (${reassignedRiskFollowUpCount})`}
              </button>
            ))}
            {filteredRiskFollowUpItems.length > 0 && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                  onClick={handleSelectAllVisibleRiskFollowUpItems}
                >
                  Select visible
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                  onClick={handleSelectUnownedRiskFollowUpItems}
                >
                  Select unowned
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                  onClick={handleClearRiskFollowUpSelection}
                  disabled={selectedRiskFollowUpAccountIds.length === 0}
                >
                  Clear selection
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                  onClick={handleBulkTakeRiskFollowUpOwnership}
                  disabled={selectedRiskFollowUpAccountIds.length === 0}
                >
                  Take ownership of selected
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                  onClick={handleBulkMarkRiskFollowUpReviewed}
                  disabled={selectedRiskFollowUpAccountIds.length === 0}
                >
                  Mark selected reviewed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                  onClick={handleBulkReopenRiskFollowUpItems}
                  disabled={selectedRiskFollowUpAccountIds.length === 0}
                >
                  Reopen selected
                </Button>
              </>
            )}
          </div>
          {filteredRiskFollowUpItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
              No risk follow-up items match the current search right now.
            </div>
          ) : (
            filteredRiskFollowUpItems.map((item) => (
              <div key={item.accountId} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={selectedRiskFollowUpAccountIds.includes(item.accountId)}
                      onChange={() => handleToggleRiskFollowUpSelection(item.accountId)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    Select
                  </label>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.accountName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.headline}</p>
                    <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      item.tone === "danger"
                        ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                        : item.tone === "warn"
                          ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                          : "border-white/10 bg-white/[0.03] text-zinc-300"
                    }`}
                  >
                    {item.status === "BREACHED" ? "Hold" : item.status === "WARN" ? "Review" : "Pending"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>Recommended action: {item.recommendedAction}</span>
                  {item.notificationTimestamp && (
                    <span>Alerted at: {formatTimestamp(item.notificationTimestamp)}</span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                  {item.review?.operatorName && (
                    <span>Operator owner: {item.review.operatorName}</span>
                  )}
                  {(item.review?.operatorHistory?.length ?? 0) > 0 && (
                    <span>Ownership changes: {item.review?.operatorHistory?.length}</span>
                  )}
                  {item.review?.reviewedAt && (
                    <span>Reviewed at: {formatTimestamp(item.review.reviewedAt)}</span>
                  )}
                </div>

                {(item.review?.operatorHistory?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      Ownership Timeline
                    </p>
                    <div className="mt-2 space-y-2">
                      {item.review?.operatorHistory?.slice(-3).reverse().map((assignment, index) => (
                        <div
                          key={`${item.accountId}-risk-owner-${index}`}
                          className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                        >
                          <p className="text-zinc-200">
                            {assignment.operatorName} on {formatTimestamp(assignment.assignedAt)}
                          </p>
                          {assignment.reason && (
                            <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  value={riskFollowUpNotes[item.accountId] ?? item.review?.note ?? ""}
                  onChange={(event) =>
                    setRiskFollowUpNotes((current) => ({
                      ...current,
                      [item.accountId]: event.target.value,
                    }))
                  }
                  placeholder="Shared risk note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                    onClick={() => handleTakeRiskFollowUpOwnership(item.accountId)}
                  >
                    Take ownership
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                    onClick={() => handleSaveRiskFollowUpNote(item.accountId)}
                  >
                    Save note
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={
                      item.review?.status === "reviewed"
                        ? "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    }
                    onClick={() =>
                      item.review?.status === "reviewed"
                        ? handleReopenRiskFollowUpItem(item.accountId)
                        : handleMarkRiskFollowUpReviewed(item.accountId)
                    }
                  >
                    {item.review?.status === "reviewed" ? "Reopen" : "Mark reviewed"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,22,0.98),rgba(8,10,16,0.98))] p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Operator Audit</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Manual sync ownership watchlist</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Review overdue follow-up, unassigned work, and items that have already changed hands.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <button
            type="button"
            className={`rounded-2xl border p-4 text-left ${
              queueAuditFocus === "overdue"
                ? "border-amber-300/40 bg-amber-300/15"
                : "border-amber-400/20 bg-amber-400/10"
            }`}
            onClick={() => handleSelectAuditFocus(queueAuditFocus === "overdue" ? "all" : "overdue")}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Overdue</p>
              <span className="rounded-full border border-amber-400/30 px-2.5 py-1 text-xs text-amber-100">
                {overdueSyncEntries.length}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {overdueSyncEntries.length === 0 ? (
                <p className="text-sm text-amber-100/80">No overdue manual sync items right now.</p>
              ) : (
                overdueSyncEntries.slice(0, 3).map((entry) => (
                  <div key={`${entry.key}-overdue`} className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                    <p className="text-sm font-medium text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                    <p className="mt-2 text-xs text-amber-100">{entry.attentionLabel}</p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.ageMinutes} minutes in current stage</p>
                  </div>
                ))
              )}
            </div>
          </button>

          <button
            type="button"
            className={`rounded-2xl border p-4 text-left ${
              queueAuditFocus === "unassigned"
                ? "border-cyan-300/40 bg-cyan-300/15"
                : "border-cyan-400/20 bg-cyan-400/10"
            }`}
            onClick={() => handleSelectAuditFocus(queueAuditFocus === "unassigned" ? "all" : "unassigned")}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Unassigned</p>
              <span className="rounded-full border border-cyan-400/30 px-2.5 py-1 text-xs text-cyan-100">
                {unassignedSyncEntries.length}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {unassignedSyncEntries.length === 0 ? (
                <p className="text-sm text-cyan-100/80">Every active manual sync item has an owner.</p>
              ) : (
                unassignedSyncEntries.slice(0, 3).map((entry) => (
                  <div key={`${entry.key}-unassigned`} className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                    <p className="text-sm font-medium text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                    <p className="mt-2 text-xs text-cyan-100">
                      {entry.status === "approved" ? "Ready for ownership claim" : "Needs operator completion owner"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.ageMinutes} minutes since last workflow change</p>
                  </div>
                ))
              )}
            </div>
          </button>

          <button
            type="button"
            className={`rounded-2xl border p-4 text-left ${
              queueAuditFocus === "reassigned"
                ? "border-violet-300/40 bg-violet-300/15"
                : "border-violet-400/20 bg-violet-400/10"
            }`}
            onClick={() => handleSelectAuditFocus(queueAuditFocus === "reassigned" ? "all" : "reassigned")}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Reassigned</p>
              <span className="rounded-full border border-violet-400/30 px-2.5 py-1 text-xs text-violet-100">
                {reassignedSyncEntries.length}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {reassignedSyncEntries.length === 0 ? (
                <p className="text-sm text-violet-100/80">No ownership changes have been logged yet.</p>
              ) : (
                reassignedSyncEntries.slice(0, 3).map((entry) => (
                  <div key={`${entry.key}-reassigned`} className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                    <p className="text-sm font-medium text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                    <p className="mt-2 text-xs text-violet-100">
                      {entry.reassignmentCount} ownership change{entry.reassignmentCount === 1 ? "" : "s"}
                    </p>
                    {entry.latestAssignmentReason && (
                      <p className="mt-1 text-xs text-zinc-500">{entry.latestAssignmentReason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Sync Review Queue</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Shared review and simulation queue</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Track review progress from first check through operator handoff and manual completion.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:w-[360px]">
            <Input
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              placeholder="Search by group, follower, note, or symbol"
              className="border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
            />
            <div className="flex flex-wrap gap-2">
              {(["recent", "age", "owner", "reassignments"] as const).map((sort) => (
                <button
                  key={sort}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    queueSort === sort
                      ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-200"
                  }`}
                  onClick={() => setQueueSort(sort)}
                >
                  {sort === "recent"
                    ? "Newest"
                    : sort === "age"
                      ? "Oldest First"
                      : sort === "owner"
                        ? "Owner"
                        : "Reassignments"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {queueAuditFocus !== "all" && (
                <button
                  type="button"
                  className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-sm text-amber-100"
                  onClick={() => setQueueAuditFocus("all")}
                >
                  {queueAuditFocus === "overdue"
                    ? "Audit: Overdue"
                    : queueAuditFocus === "unassigned"
                      ? "Audit: Unassigned"
                      : "Audit: Reassigned"}
                </button>
              )}
              {(["all", "reviewed", "simulated", "approved", "handed_off", "completed_manually"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    queueFilter === filter
                      ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-200"
                  }`}
                  onClick={() => setQueueFilter(filter)}
                >
                  {filter === "all"
                    ? `All (${positionSyncQueue.length})`
                    : filter === "reviewed"
                      ? `Reviewed (${reviewedSyncCount})`
                      : filter === "simulated"
                        ? `Simulated (${simulatedSyncCount})`
                        : filter === "approved"
                          ? `Approved (${approvedSyncCount})`
                          : filter === "handed_off"
                            ? `Handed Off (${handedOffSyncCount})`
                            : `Completed (${completedManuallySyncCount})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {sortedAuditFocusedQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
              No sync review items match the current filters yet.
            </div>
          ) : (
            sortedAuditFocusedQueue.map((entry) => (
              <div key={entry.key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.followerName}</p>
                    <p className="mt-2 text-sm text-zinc-400">{entry.summary}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${getPositionSyncStatusTone(entry.status)}`}
                  >
                    {getPositionSyncStatusLabel(entry.status)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                  <span>{entry.adjustmentCount} adjustment{entry.adjustmentCount === 1 ? "" : "s"}</span>
                  <span>{entry.ageMinutes} min in current stage</span>
                  {entry.topAdjustments.length > 0 && (
                    <span>Symbols: {entry.topAdjustments.join(", ")}</span>
                  )}
                </div>

                {entry.note && (
                  <p className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-xs text-zinc-300">
                    Review note: {entry.note}
                  </p>
                )}
                {entry.operatorName ? (
                  <p className="mt-3 text-xs text-zinc-400">
                    Operator owner: {entry.operatorName}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-amber-200">
                    Operator owner: Unassigned
                  </p>
                )}
                {entry.reassignmentCount > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Ownership changes: {entry.reassignmentCount}
                  </p>
                )}
                {entry.latestAssignmentReason && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Latest ownership reason: {entry.latestAssignmentReason}
                  </p>
                )}
                {(entry.operatorHistory?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      Ownership Timeline
                    </p>
                    <div className="mt-2 space-y-2">
                      {entry.operatorHistory?.map((assignment, index) => (
                        <div
                          key={`${entry.key}-assignment-${index}`}
                          className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                        >
                          <p className="text-zinc-200">
                            {assignment.operatorName} on {formatTimestamp(assignment.assignedAt)}
                          </p>
                          {assignment.reason && (
                            <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.needsAttention && entry.attentionLabel && (
                  <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    Needs follow-up: {entry.attentionLabel}
                  </p>
                )}

                {(entry.status === "approved" || entry.status === "handed_off") && (
                  <Input
                    value={assignmentReasons[entry.key] ?? ""}
                    onChange={(event) =>
                      setAssignmentReasons((current) => ({
                        ...current,
                        [entry.key]: event.target.value,
                      }))
                    }
                    placeholder="Optional ownership reason"
                    className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                  />
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(entry.status === "reviewed" || entry.status === "simulated") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                      onClick={() => handleApproveSyncQueueEntry(entry)}
                      disabled={savePositionSyncWorkflowMutation.isPending}
                    >
                      {savePositionSyncWorkflowMutation.isPending ? "Saving..." : "Approve for manual execution"}
                    </Button>
                  )}
                  {entry.status === "approved" && (
                    <>
                      {!entry.operatorName && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                          onClick={() => handleTakeOwnership(entry)}
                          disabled={savePositionSyncWorkflowMutation.isPending}
                        >
                          {savePositionSyncWorkflowMutation.isPending ? "Saving..." : "Take ownership"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                        onClick={() => handleHandOffSyncQueueEntry(entry)}
                        disabled={savePositionSyncWorkflowMutation.isPending}
                      >
                        {savePositionSyncWorkflowMutation.isPending ? "Saving..." : "Hand off for manual execution"}
                      </Button>
                      <span className="text-xs text-emerald-300">
                        Ready for operator-led manual execution review.
                      </span>
                    </>
                  )}
                  {entry.status === "handed_off" && (
                    <>
                      {!entry.operatorName && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                          onClick={() => handleTakeOwnership(entry)}
                          disabled={savePositionSyncWorkflowMutation.isPending}
                        >
                          {savePositionSyncWorkflowMutation.isPending ? "Saving..." : "Take ownership"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                        onClick={() => handleCompleteSyncQueueEntry(entry)}
                        disabled={savePositionSyncWorkflowMutation.isPending}
                      >
                        {savePositionSyncWorkflowMutation.isPending ? "Saving..." : "Mark completed manually"}
                      </Button>
                      <span className="text-xs text-amber-200">
                        Assigned to an operator for manual follow-through.
                      </span>
                    </>
                  )}
                  {entry.status === "completed_manually" && (
                    <span className="text-xs text-emerald-300">
                      Manual execution follow-through has been logged.
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-zinc-500">
                  {getPositionSyncStatusTimestamp(entry) ?? "Timestamp unavailable"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

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
