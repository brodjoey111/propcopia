import { AlertTriangle, BellRing, Siren } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { clusterNotifications, getTopNotification } from "@/lib/notifications";

function getBannerStyles(severity: "info" | "warn" | "error") {
  switch (severity) {
    case "error":
      return {
        container: "bg-rose-600 text-white",
        icon: Siren,
      };
    case "warn":
      return {
        container: "bg-amber-500 text-black",
        icon: AlertTriangle,
      };
    default:
      return {
        container: "bg-cyan-600 text-white",
        icon: BellRing,
      };
  }
}

export function TopNotificationBanner() {
  const { data } = useNotifications();
  const clusteredNotifications = clusterNotifications(data?.notifications ?? []);
  const topNotification =
    getTopNotification(clusteredNotifications) as (typeof clusteredNotifications)[number] | null;

  if (!topNotification) {
    return null;
  }

  const { container, icon: Icon } = getBannerStyles(topNotification.severity);

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${container}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        <strong>{topNotification.title}</strong>
        <span className="opacity-90"> · {topNotification.message}</span>
        {"relatedCount" in topNotification && topNotification.relatedCount > 0 ? (
          <span className="opacity-75">
            {" "}
            +{topNotification.relatedCount} earlier update{topNotification.relatedCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </span>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="h-7 shrink-0 border-white/30 bg-transparent text-current hover:bg-white/15"
      >
        <Link href="/notifications">Review</Link>
      </Button>
    </div>
  );
}
