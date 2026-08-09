import { Bell } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNowStrict } from "date-fns";

export function NotificationCenter() {
  const { data } = useNotifications();
  const unreadEstimate = data?.unreadEstimate ?? 0;
  const notifications = data?.notifications.slice(0, 6) ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative h-11 w-11 border-white/10 bg-white/[0.03] p-0"
          data-testid="button-notification-center"
        >
          <Bell className="h-4 w-4" />
          {unreadEstimate > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadEstimate > 99 ? "99+" : unreadEstimate}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] border-white/10 bg-[rgba(5,10,20,0.98)] p-0 text-white"
      >
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Notifications</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Operations Inbox</h2>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-400">
              No notifications right now.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="border-b border-white/6 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{notification.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{notification.message}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                    {notification.severity}
                  </span>
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  {formatDistanceToNowStrict(new Date(notification.timestamp), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <Button asChild variant="outline" className="w-full border-white/10 bg-white/[0.03]">
            <Link href="/notifications">Open full inbox</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
