import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "lucide-react";

interface ActivityEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "trade" | "connection" | "error" | "success";
}

interface LiveActivityFeedProps {
  activities: ActivityEntry[];
}

export function LiveActivityFeed({ activities }: LiveActivityFeedProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "trade":
        return "bg-primary/10 text-primary";
      case "connection":
        return "bg-chart-1/10 text-chart-1";
      case "error":
        return "bg-destructive/10 text-destructive";
      case "success":
        return "bg-chart-2/10 text-chart-2";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="card-3d p-4">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        <h3 className="font-semibold">Live Activity</h3>
      </div>
      
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 border-b pb-3 last:border-0"
                data-testid={`activity-${activity.id}`}
              >
                <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${getTypeColor(activity.type)}`} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
