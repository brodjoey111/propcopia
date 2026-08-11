import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/user-context";
import { useNotifications } from "@/hooks/use-notifications";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  buildRiskNotificationFollowUpQueue,
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

const RISK_FOLLOW_UP_REVIEWED_STORAGE_KEY = "propcopia.notifications.riskFollowUpReviewed";

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

export default function Notifications() {
  const { user } = useUser();
  const { data, isLoading, error } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showReviewed, setShowReviewed] = useState(true);
  const [riskFollowUpNotes, setRiskFollowUpNotes] = useState<Record<string, string>>({});
  const [reviewedRiskFollowUpItems, setReviewedRiskFollowUpItems] = useState<Record<string, string>>(
    loadReviewedRiskFollowUpItems,
  );

  useEffect(() => {
    setShowReviewed(user?.showReviewedNotifications ?? true);
  }, [user?.showReviewedNotifications]);

  const { data: riskFollowUpReviewData } = useQuery<{
    success: boolean;
    reviews: RiskFollowUpReviewEntry[];
  } | null>({
    queryKey: user?.id ? ["/api/risk-follow-up/reviews", user.id] : ["/api/risk-follow-up/reviews", "anonymous"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to load risk follow-up reviews");
      }

      return response.json();
    },
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
    },
  });

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

  const notifications = filterReviewedNotifications(data?.notifications ?? [], showReviewed);
  const summary = summarizeNotifications(notifications);
  const clusteredNotifications = clusterNotifications(notifications);
  const allRiskFollowUpItems = buildRiskNotificationFollowUpQueue(data?.notifications ?? []);
  const riskFollowUpItems = allRiskFollowUpItems
    .filter((item) => showReviewed || !reviewedRiskFollowUpItems[item.id])
    .slice(0, 4);
  const reviewedRiskFollowUpCount = allRiskFollowUpItems.filter(
    (item) => !!reviewedRiskFollowUpItems[item.id],
  ).length;
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
      const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((review) => review.accountId === id);
      saveRiskFollowUpReviewsMutation.mutate([
        {
          accountId: id,
          status: "reviewed",
          note: riskFollowUpNotes[id]?.trim() || currentReview?.note,
          operatorName: user.username,
          operatorHistory: appendRiskFollowUpOperatorAssignment(
            currentReview?.operatorHistory,
            user.username,
            now,
            "Reviewed risk follow-up item",
          ),
          reviewedAt: now,
        },
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
      const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((review) => review.accountId === id);
      saveRiskFollowUpReviewsMutation.mutate([
        {
          accountId: id,
          status: "pending",
          note: riskFollowUpNotes[id]?.trim() || currentReview?.note,
          operatorName: currentReview?.operatorName ?? user.username,
          operatorHistory: appendRiskFollowUpOperatorAssignment(
            currentReview?.operatorHistory,
            user.username,
            now,
            "Reopened risk follow-up item",
          ),
        },
      ]);
      return;
    }

    setReviewedRiskFollowUpItems((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const handleTakeOwnership = (id: string) => {
    if (!user?.id) {
      return;
    }

    const now = new Date().toISOString();
    const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((review) => review.accountId === id);
    saveRiskFollowUpReviewsMutation.mutate([
      {
        accountId: id,
        status: currentReview?.status ?? "pending",
        note: riskFollowUpNotes[id]?.trim() || currentReview?.note,
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

  const handleSaveRiskFollowUpNote = (id: string) => {
    if (!user?.id) {
      return;
    }

    const currentReview = (riskFollowUpReviewData?.reviews ?? []).find((review) => review.accountId === id);
    saveRiskFollowUpReviewsMutation.mutate([
      {
        accountId: id,
        status: currentReview?.status ?? "pending",
        note: riskFollowUpNotes[id]?.trim() || undefined,
        operatorName: currentReview?.operatorName ?? user.username,
        operatorHistory: currentReview?.operatorHistory,
        reviewedAt: currentReview?.reviewedAt,
      },
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

      {riskFollowUpItems.length > 0 && (
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Risk Follow-Up</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Manual risk review queue</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Prioritized risk items that should be reviewed before the next copy session starts.
              </p>
            </div>
            {reviewedRiskFollowUpCount > 0 && (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                {reviewedRiskFollowUpCount} reviewed
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {riskFollowUpItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.severity === "error"
                    ? "border-rose-400/20 bg-rose-400/10"
                    : item.severity === "warn"
                      ? "border-amber-400/20 bg-amber-400/10"
                      : "border-cyan-400/20 bg-cyan-400/10"
                }`}
              >
                {(() => {
                  const review = (riskFollowUpReviewData?.reviews ?? []).find((entry) => entry.accountId === item.id);
                  const noteValue = riskFollowUpNotes[item.id] ?? review?.note ?? "";
                  const reassignmentCount = review?.operatorHistory?.length ?? 0;
                  return (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-white/80">{item.detail}</p>
                    <p className="mt-2 text-xs text-zinc-300">{item.actionLabel}</p>
                    {review?.operatorName && (
                      <p className="mt-2 text-xs text-cyan-200">
                        Owner: {review.operatorName}
                      </p>
                    )}
                    {reassignmentCount > 0 && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Ownership changes: {reassignmentCount}
                      </p>
                    )}
                    {reviewedRiskFollowUpItems[item.id] && (
                      <p className="mt-2 text-xs text-emerald-200">
                        Reviewed at {formatTimestamp(reviewedRiskFollowUpItems[item.id])}
                      </p>
                    )}
                    <Input
                      value={noteValue}
                      onChange={(event) =>
                        setRiskFollowUpNotes((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Shared operator note"
                      className="mt-3 border-white/10 bg-black/10 text-white placeholder:text-zinc-500"
                    />
                    {review?.note && !riskFollowUpNotes[item.id] && (
                      <p className="mt-2 text-xs text-zinc-400">Saved note: {review.note}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                      {formatTimestamp(item.timestamp)}
                    </p>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {user?.id && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-white/10 bg-white/[0.03] text-zinc-300"
                            onClick={() => handleTakeOwnership(item.id)}
                          >
                            {review?.operatorName === user.username ? "Refresh owner" : "Take ownership"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                            onClick={() => handleSaveRiskFollowUpNote(item.id)}
                          >
                            Save note
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={reviewedRiskFollowUpItems[item.id] ? "outline" : "default"}
                      className={
                        reviewedRiskFollowUpItems[item.id]
                          ? "border-white/10 bg-white/[0.03] text-zinc-300"
                          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                      }
                      onClick={() =>
                        reviewedRiskFollowUpItems[item.id]
                          ? handleReopenRiskFollowUpItem(item.id)
                          : handleMarkRiskFollowUpReviewed(item.id)
                      }
                    >
                      {reviewedRiskFollowUpItems[item.id] ? "Reopen" : "Mark reviewed"}
                    </Button>
                  </div>
                </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </Card>
      )}

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
                  {"relatedCount" in notification && notification.relatedCount > 0 ? (
                    <p className="text-xs text-zinc-300">
                      +{notification.relatedCount} related update{notification.relatedCount === 1 ? "" : "s"} grouped into this alert
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
