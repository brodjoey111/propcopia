import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  change?: number;
  icon?: LucideIcon;
  testId?: string;
}

export function StatsCard({ label, value, change, icon: Icon, testId }: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums" data-testid={testId}>
            {value}
          </p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-sm ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="tabular-nums">
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}
