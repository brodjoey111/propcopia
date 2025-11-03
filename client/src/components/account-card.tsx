import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Unplug } from "lucide-react";

interface AccountCardProps {
  id: string;
  name: string;
  platform: string;
  accountType: "master" | "follower";
  isConnected: boolean;
  balance: number;
  openPositions: number;
  pnl: number;
  positionScaling?: number;
  onConfigure?: () => void;
  onDisconnect?: () => void;
}

export function AccountCard({
  id,
  name,
  platform,
  accountType,
  isConnected,
  balance,
  openPositions,
  pnl,
  positionScaling,
  onConfigure,
  onDisconnect,
}: AccountCardProps) {
  const isPnlPositive = pnl >= 0;

  return (
    <Card className="card-3d shimmer p-4" data-testid={`card-account-${id}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold" data-testid={`text-account-name-${id}`}>{name}</h3>
              <Badge variant={accountType === "master" ? "default" : "secondary"} className="text-xs">
                {accountType}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{platform}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-status-online' : 'bg-status-offline'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="mt-1 text-base font-semibold tabular-nums" data-testid={`text-balance-${id}`}>
              ${balance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Positions</p>
            <p className="mt-1 text-base font-semibold tabular-nums" data-testid={`text-positions-${id}`}>
              {openPositions}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P&L</p>
            <p className={`mt-1 text-base font-semibold tabular-nums ${isPnlPositive ? 'text-chart-2' : 'text-destructive'}`} data-testid={`text-pnl-${id}`}>
              {isPnlPositive ? '+' : ''}${pnl.toLocaleString()}
            </p>
          </div>
          {positionScaling !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">Scaling</p>
              <p className="mt-1 text-base font-semibold tabular-nums">
                {positionScaling}%
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onConfigure}
            data-testid={`button-configure-${id}`}
          >
            <Settings className="mr-2 h-3 w-3" />
            Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 ${
              isConnected 
                ? 'border-chart-2 text-chart-2 hover:bg-chart-2/10' 
                : 'border-destructive text-destructive hover:bg-destructive/10'
            }`}
            onClick={onDisconnect}
            data-testid={`button-disconnect-${id}`}
          >
            <Unplug className="mr-2 h-3 w-3" />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
