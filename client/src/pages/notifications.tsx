import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/use-notifications";
import {
  filterNotifications,
  summarizeNotifications,
  toActivityFeedType,
  type NotificationFilter,
} from "@/lib/notifications";

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

function getCategoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

export default function Notifications() {
  const { data, isLoading, error } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const notifications = data?.notifications ?? [];
  const summary = summarizeNotifications(notifications);
  const filteredNotifications = filterNotifications(notifications, filter, searchQuery);
  const filterButtons: Array<{ id: NotificationFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "error", label: "Errors" },
    { id: "warn", label: "Warnings" },
    { id: "trade", label: "Trades" },
    { id: "copy_group", label: "Copy Groups" },
    { id: "position", label: "Positions" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Notifications</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Operations Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated system issues from copy groups, trade execution, and live position availability.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search notifications"
            className="w-full max-w-sm"
          />
        </div>
      </Card>

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
              className={`border p-5 ${getToneStyles(notification.severity)}`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
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
                  <p className="text-sm text-white/80">{notification.message}</p>
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
