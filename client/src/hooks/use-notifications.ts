import { useQuery } from "@tanstack/react-query";

import { useUser } from "@/contexts/user-context";
import {
  LIVE_QUERY_STALE_MS,
  OPERATOR_QUERY_POLL_MS,
} from "@/lib/live-query-config";
import {
  applyNotificationPreferences,
  type NotificationsResponse,
} from "@/lib/notifications";

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
  const { user } = useUser();

  return useQuery<NotificationsResponse | null, Error, NotificationsResponse | null>({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
    refetchInterval: OPERATOR_QUERY_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
    select: (data) => {
      if (!data) {
        return null;
      }

      const notifications = applyNotificationPreferences(data.notifications, {
        notifyTrades: user?.notifyTrades,
        notifyErrors: user?.notifyErrors,
        notifyConnection: user?.notifyConnection,
      });

      return {
        ...data,
        unreadEstimate: notifications.length,
        notifications,
      };
    },
  });
}
