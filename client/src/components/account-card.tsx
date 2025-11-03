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
  maxContracts?: number;
  blockedTickers?: string[];
  onConfigure?: React.ReactNode;
  onConnect?: () => void;
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
  maxContracts,
  blockedTickers = [],
  onConfigure,
  onConnect,
  onDisconnect,
}: AccountCardProps) {
  const isPnlPositive = pnl >= 0;
  const hasRestrictions = maxContracts !== undefined || blockedTickers.length > 0;

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
              <p className="mt-1 text-base font-semibold tabular-nums" data-testid={`text-scaling-${id}`}>
                {positionScaling}%
              </p>
            </div>
          )}
        </div>

        {hasRestrictions && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {maxContracts !== undefined && (
              <Badge variant="outline" className="text-xs" data-testid={`badge-max-contracts-${id}`}>
                Max {maxContracts} contracts
              </Badge>
            )}
            {blockedTickers.length > 0 && (
              <Badge variant="outline" className="text-xs" data-testid={`badge-blocked-tickers-${id}`}>
                {blockedTickers.length} blocked ticker{blockedTickers.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {onConfigure ? (
            <div className="flex-1">
              {onConfigure}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled
              data-testid={`button-configure-${id}`}
            >
              <Settings className="mr-2 h-3 w-3" />
              Configure
            </Button>
          )}
          <Button
            size="sm"
            className={`flex-1 ${
              isConnected 
                ? 'bg-chart-2 text-white hover:bg-chart-2/90' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={onConnect}
            disabled={isConnected}
            data-testid={`button-connect-${id}`}
          >
            Connect
          </Button>
          <Button
            size="sm"
            className={`flex-1 ${
              !isConnected 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={onDisconnect}
            disabled={!isConnected}
            data-testid={`button-disconnect-${id}`}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </Card>
  );
}
