import { useQuery } from "@tanstack/react-query";

import { LiveActivityFeed } from "@/components/live-activity-feed";
import { useNotifications } from "@/hooks/use-notifications";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
} from "@/lib/live-query-config";
import {
  buildCopyGroupActivityFeed,
  filterCopyGroupActivityFeed,
  hydrateCopyGroup,
  type CopyGroup,
  type CopyGroupSnapshotApiResponse,
} from "@/lib/copy-groups";
import { toActivityFeedType } from "@/lib/notifications";

interface ActivityPageData {
  groups: CopyGroup[];
  feed: ReturnType<typeof buildCopyGroupActivityFeed>;
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
    snapshot.groups.map((group) => [group.group.group.groupId, group.activity]),
  );

  return {
    groups,
    feed: buildCopyGroupActivityFeed(groups, activityByGroupId),
  };
}

export default function Activity() {
  const {
    data,
    isLoading,
    error,
  } = useQuery<ActivityPageData>({
    queryKey: ["/api/copy-groups", "activity-page"],
    queryFn: loadActivityPageData,
    refetchInterval: LIVE_QUERY_POLL_MS,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: notificationsData } = useNotifications();

  const groups = data?.groups ?? [];
  const allActivity = data?.feed ?? [];
  const alertActivity = filterCopyGroupActivityFeed(allActivity, "alerts");
  const notifications = notificationsData?.notifications ?? [];
  const unreadEstimate = notificationsData?.unreadEstimate ?? 0;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Execution feed</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Live Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Copy-group lifecycle, routing, and execution events flowing from the real backend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Copy Groups</p>
          <p className="mt-2 text-2xl font-semibold text-white">{groups.length}</p>
          <p className="mt-1 text-sm text-zinc-400">registered runtime pipelines</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Recent Events</p>
          <p className="mt-2 text-2xl font-semibold text-white">{allActivity.length}</p>
          <p className="mt-1 text-sm text-zinc-400">latest events loaded across all groups</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Notifications</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{unreadEstimate}</p>
          <p className="mt-1 text-sm text-zinc-400">operational alerts and follow-up items</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <LiveActivityFeed
          activities={
            isLoading
              ? []
              : notifications.map((notification) => ({
                  id: notification.id,
                  timestamp: formatTimestamp(notification.timestamp),
                  message: `${notification.title}: ${notification.message}`,
                  type: toActivityFeedType(notification),
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
                }))
          }
        />
      </div>
    </div>
  );
}
