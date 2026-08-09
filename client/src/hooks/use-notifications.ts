import { useQuery } from "@tanstack/react-query";

import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
} from "@/lib/live-query-config";
import type { NotificationsResponse } from "@/lib/notifications";

export const notificationsQueryKey = ["/api/notifications"] as const;

async function fetchNotifications(): Promise<NotificationsResponse | null> {
  const res = await fetch("/api/notifications", {
    credentials: "include",
  });

  if (res.status === 401 || res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export function useNotifications() {
  return useQuery<NotificationsResponse | null>({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    refetchInterval: LIVE_QUERY_POLL_MS,
    staleTime: LIVE_QUERY_STALE_MS,
  });
}
