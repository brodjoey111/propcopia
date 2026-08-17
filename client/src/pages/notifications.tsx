import { useEffect, useState } from "react";

import { NotificationsFollowUpPanels } from "@/components/notifications-follow-up-panels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/user-context";
import { notificationsQueryKey, useNotifications } from "@/hooks/use-notifications";
import { useFollowUpReviewActions } from "@/hooks/use-follow-up-review-actions";
import { useFollowUpReviewData } from "@/hooks/use-follow-up-review-data";
import { useOperatorFollowUpData } from "@/hooks/use-operator-follow-up-data";
import { usePositionSyncReviewData } from "@/hooks/use-position-sync-review-data";
import { usePositionSyncWorkflowActions } from "@/hooks/use-position-sync-workflow-actions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  buildExecutionFollowUpReviewPayload,
  buildRithmicReadinessReviewPayload,
  buildRiskFollowUpReviewPayload,
  type ExecutionFollowUpReviewEntry,
  type RiskFollowUpReviewEntry,
} from "@/lib/follow-up-operator";
import {
  clusterNotifications,
  describeExecutionAttentionNotification,
  describeNotificationMessage,
  filterReviewedNotifications,
  filterNotifications,
  summarizeNotifications,
  toActivityFeedType,
  type ClusteredNotificationItem,
  type NotificationFilter,
} from "@/lib/notifications";
import {
  summarizePositionSyncRepairCandidateQueue,
} from "@/lib/position-sync-queue";
import {
  type DashboardRuntimeOverviewResponse,
} from "@/lib/runtime-overview";
import {
  buildPositionSyncWorkflowUpdate,
} from "@/lib/position-sync-workflow";

const RISK_FOLLOW_UP_REVIEWED_STORAGE_KEY = "propcopia.notifications.riskFollowUpReviewed";

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function getToneStyles(severity: "info" | "warn" | "error") {
  switch (severity) {
    case "error":
      return "border-rose-400/20 bg-rose-400/10 text-rose-100";
    case "warn":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    default:
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
  }
}

function getNotificationCardStyles(notification: ClusteredNotificationItem) {
  if (notification.reviewStatus === "reviewed" && notification.category !== "trade") {
    return "border-emerald-400/12 bg-emerald-400/6 text-emerald-50";
  }

  if (
    notification.category === "trade" &&
    notification.tradeSummary?.reviewStatus === "reviewed"
  ) {
    return "border-emerald-400/12 bg-emerald-400/6 text-emerald-50";
  }

  return getToneStyles(notification.severity);
}

function getCategoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

function loadReviewedRiskFollowUpItems(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(RISK_FOLLOW_UP_REVIEWED_STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored) as Record<string, string>;
  } catch {
    return {};
  }
}

function parseRiskFollowUpReviewsJson(value?: string | null): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

export default function Notifications() {
  const { toast } = useToast();
  const { user } = useUser();
  const { data, isLoading, error } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showReviewed, setShowReviewed] = useState(true);
  const [riskFollowUpNotes, setRiskFollowUpNotes] = useState<Record<string, string>>({});
  const [reviewedRiskFollowUpItems, setReviewedRiskFollowUpItems] = useState<Record<string, string>>(
    loadReviewedRiskFollowUpItems,
  );
  const [executionFollowUpNotes, setExecutionFollowUpNotes] = useState<Record<string, string>>({});
  const [rithmicReadinessNotes, setRithmicReadinessNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setShowReviewed(user?.showReviewedNotifications ?? true);
  }, [user?.showReviewedNotifications]);

  const {
    riskFollowUpReviewData,
    executionFollowUpReviewData,
    rithmicReadinessReviewData,
    riskReviewsByAccountId,
    executionReviewsByHistoryId,
    rithmicReadinessReviewsByStoryKey,
  } = useFollowUpReviewData(user?.id);
  const { data: dashboardRuntimeOverviewData } = useQuery<DashboardRuntimeOverviewResponse | null>({
    queryKey: user?.id ? ["/api/runtime/dashboard-overview", user.id] : ["/api/runtime/dashboard-overview", "anonymous"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to load dashboard runtime overview");
      }

      return response.json();
    },
    enabled: !!user?.id,
  });
  const {
    positionSyncWorkflowData,
    positionSyncWorkflowState,
    positionSyncRepairCandidates,
  } = usePositionSyncReviewData({
    userId: user?.id,
    enabled: !!user?.id,
  });
  useEffect(() => {
    if (user?.id) {
      const reviews = Object.fromEntries(
        (riskFollowUpReviewData?.reviews ?? [])
          .filter((review) => review.reviewedAt)
          .map((review) => [review.accountId, review.reviewedAt ?? new Date().toISOString()]),
      );
      setReviewedRiskFollowUpItems(reviews);
      return;
    }

    setReviewedRiskFollowUpItems(
      parseRiskFollowUpReviewsJson(user?.riskFollowUpReviewsJson),
    );
  }, [riskFollowUpReviewData?.reviews, user?.id, user?.riskFollowUpReviewsJson]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      RISK_FOLLOW_UP_REVIEWED_STORAGE_KEY,
      JSON.stringify(reviewedRiskFollowUpItems),
    );
  }, [reviewedRiskFollowUpItems]);

  const saveRiskFollowUpPreferencesMutation = useMutation({
    mutationFn: async (settings: {
      riskFollowUpReviewsJson?: string | null;
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
    saveRiskFollowUpReviewsMutation,
    saveExecutionFollowUpReviewsMutation,
    saveRithmicReadinessReviewsMutation,
    recheckExecutionFollowUpItemMutation: recheckExecutionRecoveryItemMutation,
    recheckRithmicReadinessMutation,
  } = useFollowUpReviewActions({
    userId: user?.id,
  });
  const {
    savePositionSyncWorkflowMutation,
    simulatePositionSyncMutation,
  } = usePositionSyncWorkflowActions({
    userId: user?.id,
  });

  const notifications = filterReviewedNotifications(data?.notifications ?? [], showReviewed);
  const summary = summarizeNotifications(notifications);
  const clusteredNotifications = clusterNotifications(notifications);
  const {
    allRiskNotificationItems,
    visibleRiskNotificationItems,
    executionFollowUpSummary,
    visibleExecutionFollowUpItems,
  } = useOperatorFollowUpData({
    notifications: data?.notifications ?? [],
    showReviewed,
    reviewedRiskFollowUpItems,
    executionRecovery: dashboardRuntimeOverviewData?.tradeAnalytics.executionRecovery,
    riskReviews: riskFollowUpReviewData?.reviews ?? [],
    executionReviews: executionFollowUpReviewData?.reviews ?? [],
  });
  const riskFollowUpItems = visibleRiskNotificationItems.slice(0, 4);
  const executionFollowUpItems = visibleExecutionFollowUpItems.slice(0, 4);
  const reviewedRiskFollowUpCount = allRiskNotificationItems.filter(
    (item) => !!reviewedRiskFollowUpItems[item.id],
  ).length;
  const reviewedExecutionFollowUpCount = executionFollowUpSummary.reviewedCount;
  const positionSyncRepairSummary = summarizePositionSyncRepairCandidateQueue(
    positionSyncRepairCandidates,
  );
  const syncRepairFollowUpItems = positionSyncRepairCandidates
    .filter(
      (item) =>
        item.needsAttention ||
        (
          item.workflowStatus !== "not_started" &&
          item.workflowStatus !== "completed_manually" &&
          !item.operatorName
        ),
    )
    .slice(0, 4);
  const filteredNotifications = filterNotifications(
    clusteredNotifications,
    filter,
    searchQuery,
  ) as ClusteredNotificationItem[];
  const filterButtons: Array<{ id: NotificationFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "error", label: "Errors" },
    { id: "warn", label: "Warnings" },
    { id: "risk", label: "Risk" },
    { id: "trade", label: "Trades" },
    { id: "copy_group", label: "Copy Groups" },
    { id: "position", label: "Positions" },
  ];
  const handleMarkRiskFollowUpReviewed = (id: string) => {
    const now = new Date().toISOString();
    if (user?.id) {
      const currentReview = riskReviewsByAccountId.get(id);
      saveRiskFollowUpReviewsMutation.mutate([
        buildRiskFollowUpReviewPayload({
          accountId: id,
          currentReview,
          operatorName: user.username,
          note: riskFollowUpNotes[id]?.trim() || currentReview?.note,
          status: "reviewed",
          assignmentReason: "Reviewed risk follow-up item",
          reviewedAt: now,
        }),
      ]);
      return;
    }

    setReviewedRiskFollowUpItems((current) => ({
      ...current,
      [id]: now,
    }));
  };
  const handleReopenRiskFollowUpItem = (id: string) => {
    if (user?.id) {
      const now = new Date().toISOString();
      const currentReview = riskReviewsByAccountId.get(id);
      saveRiskFollowUpReviewsMutation.mutate([
        buildRiskFollowUpReviewPayload({
          accountId: id,
          currentReview,
          operatorName: currentReview?.operatorName ?? user.username,
          note: riskFollowUpNotes[id]?.trim() || currentReview?.note,
          status: "pending",
          assignmentReason: "Reopened risk follow-up item",
          reviewedAt: now,
        }),
      ]);
      return;
    }

    setReviewedRiskFollowUpItems((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  const handleExecutionRecoveryRecheck = async (historyId: string) => {
    await recheckExecutionRecoveryItemMutation.mutateAsync(historyId);
  };
  const handleExecutionRecoveryReview = async (historyId: string) => {
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
  };

  const handleTakeExecutionOwnership = (historyId: string) => {
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

  const handleReopenExecutionFollowUpItem = (historyId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = (executionFollowUpReviewData?.reviews ?? []).find(
      (entry) => entry.historyId === historyId,
    );
    const now = new Date().toISOString();
    saveExecutionFollowUpReviewsMutation.mutate([
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
  };
  const handleSaveRithmicReadinessNote = (storyKey: string, accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey);
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || undefined,
        status: currentReview?.status ?? "pending",
      }),
    ]);
  };
  const handleMarkRithmicReadinessReviewed = (storyKey: string, accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey);
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || currentReview?.note,
        status: "reviewed",
        assignmentReason: "Reviewed Rithmic readiness alert",
        reviewedAt: now,
      }),
    ]);
  };
  const handleReopenRithmicReadinessAlert = (storyKey: string, accountId: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = rithmicReadinessReviewsByStoryKey.get(storyKey);
    const now = new Date().toISOString();
    saveRithmicReadinessReviewsMutation.mutate([
      buildRithmicReadinessReviewPayload({
        storyKey,
        accountId,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: rithmicReadinessNotes[storyKey]?.trim() || currentReview?.note,
        status: "pending",
        assignmentReason: "Reopened Rithmic readiness alert",
        reviewedAt: now,
      }),
    ]);
  };
  const handleRithmicReadinessRecheck = async (accountId: string) => {
    if (!user?.id || !accountId) {
      return;
    }

    try {
      const result = await recheckRithmicReadinessMutation.mutateAsync(accountId);
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
  const handleTakeSyncRepairOwnership = (key: string) => {
    if (!user?.id) {
      return;
    }

    const [groupId, followerAccountId] = key.split(":");
    const currentReview = positionSyncWorkflowState[key];
    const now = new Date().toISOString();

    savePositionSyncWorkflowMutation.mutate([
      buildPositionSyncWorkflowUpdate({
        groupId,
        followerAccountId,
        currentEntry: currentReview,
        nextStatus: currentReview?.status ?? "reviewed",
        timestamp: now,
        note: currentReview?.note,
        operatorName: user.username,
        assignmentReason: currentReview?.operatorName
          ? "Reassigned staged sync ownership"
          : "Claimed staged sync ownership",
        appendOperatorAssignment: true,
      }),
    ]);
  };

  const handleAdvanceSyncRepairCandidate = (key: string) => {
    if (!user?.id) {
      return;
    }

    const [groupId, followerAccountId] = key.split(":");
    const currentReview = positionSyncWorkflowState[key];
    const currentItem = syncRepairFollowUpItems.find((item) => item.key === key);
    const now = new Date().toISOString();

    if (!currentItem) {
      return;
    }

    if (currentItem.workflowStatus === "not_started") {
      savePositionSyncWorkflowMutation.mutate([
        buildPositionSyncWorkflowUpdate({
          groupId,
          followerAccountId,
          currentEntry: currentReview,
          nextStatus: "reviewed",
          timestamp: now,
          note: currentReview?.note,
        }),
      ]);
      return;
    }

    if (currentItem.workflowStatus === "reviewed") {
      simulatePositionSyncMutation.mutate([
        {
          groupId,
          followerAccountId,
        },
      ]);
      return;
    }

    if (currentItem.workflowStatus === "simulated") {
      savePositionSyncWorkflowMutation.mutate([
        buildPositionSyncWorkflowUpdate({
          groupId,
          followerAccountId,
          currentEntry: currentReview,
          nextStatus: "approved",
          timestamp: now,
          note: currentReview?.note,
        }),
      ]);
    }
  };

  const handleTakeOwnership = (id: string) => {
    if (!user?.id) {
      return;
    }

    const now = new Date().toISOString();
    const currentReview = riskReviewsByAccountId.get(id);
    saveRiskFollowUpReviewsMutation.mutate([
      buildRiskFollowUpReviewPayload({
        accountId: id,
        currentReview,
        operatorName: user.username,
        note: riskFollowUpNotes[id]?.trim() || currentReview?.note,
        status: currentReview?.status ?? "pending",
        assignmentReason: currentReview?.operatorName
          ? "Reassigned risk follow-up ownership"
          : "Claimed unassigned risk follow-up",
        reviewedAt: now,
      }),
    ]);
  };

  const handleSaveRiskFollowUpNote = (id: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = riskReviewsByAccountId.get(id);
    saveRiskFollowUpReviewsMutation.mutate([
      buildRiskFollowUpReviewPayload({
        accountId: id,
        currentReview,
        operatorName: currentReview?.operatorName ?? user.username,
        note: riskFollowUpNotes[id]?.trim() || undefined,
        status: currentReview?.status ?? "pending",
      }),
    ]);
  };

  useEffect(() => {
    if (user?.id) {
      return;
    }

    const persistedReviewsJson = user?.riskFollowUpReviewsJson ?? null;
    const nextReviewsJson = JSON.stringify(reviewedRiskFollowUpItems);

    if (nextReviewsJson === (persistedReviewsJson ?? "{}")) {
      return;
    }

    saveRiskFollowUpPreferencesMutation.mutate({
      riskFollowUpReviewsJson: nextReviewsJson,
    });
  }, [reviewedRiskFollowUpItems, saveRiskFollowUpPreferencesMutation, user?.id, user?.riskFollowUpReviewsJson]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Notifications</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Operations Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated system issues from copy groups, trade execution, live position availability, and risk follow-up.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Unread Estimate</p>
          <p className="mt-2 text-2xl font-semibold text-white">{data?.unreadEstimate ?? 0}</p>
          <p className="mt-1 text-sm text-zinc-400">live items needing review</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Trade Issues</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{summary.trade}</p>
          <p className="mt-1 text-sm text-zinc-400">failed, cancelled, or rejected trades</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Connection Warnings</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {summary.copyGroup + summary.position}
          </p>
          <p className="mt-1 text-sm text-zinc-400">copy-group and position-state alerts</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Risk Alerts</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{summary.risk}</p>
          <p className="mt-1 text-sm text-zinc-400">accounts nearing or breaching configured limits</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {(error as Error).message}
        </div>
      ) : null}

      <Card className="border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((button) => (
              <Button
                key={button.id}
                variant={filter === button.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(button.id)}
              >
                {button.label}
              </Button>
            ))}
            <Button
              variant={showReviewed ? "outline" : "default"}
              size="sm"
              onClick={() => setShowReviewed((current) => !current)}
            >
              {showReviewed ? "Hide Reviewed" : "Show Reviewed"}
            </Button>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search notifications"
            className="w-full max-w-sm"
          />
        </div>
      </Card>

      <NotificationsFollowUpPanels
        userName={user?.username}
        syncRepairFollowUpItems={syncRepairFollowUpItems}
        positionSyncRepairSummary={positionSyncRepairSummary}
        riskFollowUpItems={riskFollowUpItems}
        reviewedRiskFollowUpItems={reviewedRiskFollowUpItems}
        reviewedRiskFollowUpCount={reviewedRiskFollowUpCount}
        riskFollowUpNotes={riskFollowUpNotes}
        riskReviewsByAccountId={riskReviewsByAccountId}
        executionFollowUpItems={executionFollowUpItems}
        reviewedExecutionFollowUpCount={reviewedExecutionFollowUpCount}
        executionFollowUpNotes={executionFollowUpNotes}
        formatTimestamp={formatTimestamp}
        onRiskNoteChange={(id, value) =>
          setRiskFollowUpNotes((current) => ({
            ...current,
            [id]: value,
          }))
        }
        onTakeRiskOwnership={handleTakeOwnership}
        onSaveRiskNote={handleSaveRiskFollowUpNote}
        onToggleRiskReviewed={(id, reviewed) =>
          reviewed ? handleReopenRiskFollowUpItem(id) : handleMarkRiskFollowUpReviewed(id)
        }
        onTakeExecutionOwnership={handleTakeExecutionOwnership}
        onSaveExecutionNote={handleSaveExecutionFollowUpNote}
        onRecheckExecution={(historyId) => void handleExecutionRecoveryRecheck(historyId)}
        onToggleExecutionReviewed={(historyId, reviewed) =>
          reviewed
            ? handleReopenExecutionFollowUpItem(historyId)
            : void handleExecutionRecoveryReview(historyId)
        }
        onExecutionNoteChange={(historyId, value) =>
          setExecutionFollowUpNotes((current) => ({
            ...current,
            [historyId]: value,
          }))
        }
        onTakeSyncRepairOwnership={handleTakeSyncRepairOwnership}
        onAdvanceSyncRepairCandidate={handleAdvanceSyncRepairCandidate}
      />

      <div className="space-y-3">
        {isLoading ? (
          <Card className="border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
            Loading notifications...
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
            No notifications match the current filters.
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border p-5 ${getNotificationCardStyles(notification)}`}
            >
              {notification.storyKey?.startsWith("rithmic-readiness:") ? (
                (() => {
                  const review = rithmicReadinessReviewsByStoryKey.get(notification.storyKey!);
                  const noteValue = rithmicReadinessNotes[notification.storyKey!] ?? review?.note ?? "";
                  const isReviewed = notification.reviewStatus === "reviewed";

                  return (
                    <div className="mb-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Rithmic Readiness Follow-Up
                      </p>
                      {review?.operatorName ? (
                        <p className="mt-2 text-xs text-cyan-200">Owner: {review.operatorName}</p>
                      ) : null}
                      {notification.reviewedAt ? (
                        <p className="mt-1 text-xs text-emerald-200">
                          Reviewed at {formatTimestamp(notification.reviewedAt)}
                        </p>
                      ) : null}
                      <Input
                        value={noteValue}
                        onChange={(event) =>
                          setRithmicReadinessNotes((current) => ({
                            ...current,
                            [notification.storyKey!]: event.target.value,
                          }))
                        }
                        placeholder="Shared reconnect review note"
                        className="mt-3 border-white/10 bg-black/10 text-white placeholder:text-zinc-500"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user?.id ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                              onClick={() =>
                                handleSaveRithmicReadinessNote(
                                  notification.storyKey!,
                                  notification.accountId ?? "",
                                )
                              }
                            >
                              Save note
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-sky-400/20 bg-sky-400/10 text-sky-100"
                              onClick={() =>
                                void handleRithmicReadinessRecheck(notification.accountId ?? "")
                              }
                              disabled={
                                recheckRithmicReadinessMutation.isPending || !notification.accountId
                              }
                            >
                              {recheckRithmicReadinessMutation.isPending &&
                              recheckRithmicReadinessMutation.variables === notification.accountId
                                ? "Re-checking..."
                                : "Re-check readiness"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={isReviewed ? "outline" : "default"}
                              className={
                                isReviewed
                                  ? "border-white/10 bg-white/[0.03] text-zinc-300"
                                  : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                              }
                              onClick={() =>
                                isReviewed
                                  ? handleReopenRithmicReadinessAlert(
                                      notification.storyKey!,
                                      notification.accountId ?? "",
                                    )
                                  : handleMarkRithmicReadinessReviewed(
                                      notification.storyKey!,
                                      notification.accountId ?? "",
                                    )
                              }
                            >
                              {isReviewed ? "Reopen" : "Mark reviewed"}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              ) : null}
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                        describeExecutionAttentionNotification(notification).state === "alert"
                          ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
                          : describeExecutionAttentionNotification(notification).state === "watch"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      }`}
                    >
                      {describeExecutionAttentionNotification(notification).label}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                      {getCategoryLabel(notification.category)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                      {notification.severity}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                      {toActivityFeedType(notification)}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">{notification.title}</h2>
                  <p className="text-sm text-white/80">{describeNotificationMessage(notification)}</p>
                  {notification.category === "copy_group" && notification.restartRecoveryMessage ? (
                    <p className="text-xs text-cyan-200">
                      Restart recovery: {notification.restartRecoveryMessage}
                      {notification.restartRecoveryAt
                        ? ` (${formatTimestamp(notification.restartRecoveryAt)})`
                        : ""}
                    </p>
                  ) : null}
                  {"relatedCount" in notification && notification.relatedCount > 0 ? (
                    <p className="text-xs text-zinc-300">
                      +{notification.relatedCount} related update{notification.relatedCount === 1 ? "" : "s"} grouped into this alert
                    </p>
                  ) : null}
                  {notification.reviewStatus === "reviewed" && notification.reviewNote ? (
                    <p className="text-xs text-emerald-200">
                      Reviewed note: {notification.reviewNote}
                    </p>
                  ) : null}
                  {notification.tradeSummary?.reviewStatus === "reviewed" &&
                  notification.tradeSummary.reviewNote ? (
                    <p className="text-xs text-emerald-200">
                      Reviewed note: {notification.tradeSummary.reviewNote}
                    </p>
                  ) : null}
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  {formatTimestamp(notification.timestamp)}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
