import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Unplug, Globe } from "lucide-react";

interface AccountCardProps {
  id: string;
  name: string;
  platform: string;
  accountType: "master" | "follower";
  isConnected: boolean;
  sessionStatusLabel?: string;
  sessionStatusTone?: "neutral" | "ok" | "warn";
  hasLiveBrokerData?: boolean;
  hasLiveBalance?: boolean;
  hasLivePositionData?: boolean;
  liveBrokerStatus?: "LIVE" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR" | "NONE";
  liveBrokerReason?: string;
  balance: number;
  openPositions: number;
  pnl: number;
  positionScaling?: number;
  maxContracts?: number;
  blockedTickers?: string[];
  riskMode?: 'global' | 'custom';
  riskStatusLabel?: string;
  riskStatusTone?: "ok" | "warn" | "danger" | "muted";
  onConnect?: () => void;
  onDisconnect?: () => void;
  accountActionDisabled?: boolean;
  connectButtonLabel?: string;
  disconnectButtonLabel?: string;
  configureButton?: React.ReactNode;
}

export function AccountCard({
  id,
  name,
  platform,
  accountType,
  isConnected,
  sessionStatusLabel,
  sessionStatusTone = "neutral",
  hasLiveBrokerData = false,
  hasLiveBalance = false,
  hasLivePositionData = false,
  liveBrokerStatus = "NONE",
  liveBrokerReason,
  balance,
  openPositions,
  pnl,
  positionScaling,
  maxContracts,
  blockedTickers = [],
  riskMode,
  riskStatusLabel,
  riskStatusTone = "muted",
  onConnect,
  onDisconnect,
  accountActionDisabled = false,
  connectButtonLabel = "Connect",
  disconnectButtonLabel = "Disconnect",
  configureButton,
}: AccountCardProps) {
  const isPnlPositive = pnl >= 0;
  const hasRestrictions = maxContracts !== undefined || blockedTickers.length > 0;
  const isUsingGlobalSettings = riskMode === 'global';
  const riskToneClass =
    riskStatusTone === "ok"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : riskStatusTone === "warn"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : riskStatusTone === "danger"
          ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
          : "border-white/10 bg-white/[0.04] text-zinc-300";
  const sessionToneClass =
    sessionStatusTone === "ok"
      ? "text-emerald-400"
      : sessionStatusTone === "warn"
        ? "text-amber-400"
        : "text-zinc-500";

  return (
    <Card className="card-3d shimmer rounded-[1.4rem] p-5" data-testid={`card-account-${id}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white" data-testid={`text-account-name-${id}`}>{name}</h3>
              <Badge variant={accountType === "master" ? "default" : "secondary"} className="text-xs">
                {accountType}
              </Badge>
              {isUsingGlobalSettings && (
                <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-global-mode-${id}`}>
                  <Globe className="h-3 w-3" />
                  Global
                </Badge>
              )}
              {riskStatusLabel && (
                <Badge
                  variant="outline"
                  className={`text-xs ${riskToneClass}`}
                  data-testid={`badge-risk-status-${id}`}
                >
                  {riskStatusLabel}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{platform}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]' : 'bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.35)]'}`} />
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Not connected'}
              </div>
              {isConnected && !hasLiveBrokerData && (
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  Link verified
                </div>
              )}
              {sessionStatusLabel && (
                <div className={`text-[10px] uppercase tracking-[0.12em] ${sessionToneClass}`}>
                  {sessionStatusLabel}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {hasLiveBalance ? "Balance" : "Saved Balance"}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-white" data-testid={`text-balance-${id}`}>
              ${balance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {hasLivePositionData ? "Positions" : "Saved Positions"}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-white" data-testid={`text-positions-${id}`}>
              {openPositions}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {hasLivePositionData ? "Unrealized P&L" : "Saved P&L"}
            </p>
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

        {isConnected && (!hasLiveBalance || !hasLivePositionData) && (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-zinc-400">
            {hasLiveBalance
              ? "Live balance is available. P&L and positions still show saved values."
              : hasLivePositionData
                ? "Live P&L and positions are available. Balance still shows its saved value."
                : liveBrokerReason
              ? liveBrokerReason
              : liveBrokerStatus === "DISCONNECTED"
                ? "Broker link is verified, but the live position session is disconnected."
                : "Broker link is verified. Balance, P&L, and positions still show saved values."}
          </div>
        )}

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
          <Button
            size="sm"
            variant={isConnected ? "default" : "outline"}
            className={`flex-1 ${
              isConnected 
                ? 'bg-chart-2 text-white hover:bg-chart-2/90 border-chart-2' 
                : ''
            }`}
            onClick={onConnect}
            disabled={isConnected || accountActionDisabled}
            data-testid={`button-connect-${id}`}
          >
            {connectButtonLabel}
          </Button>
          <Button
            size="sm"
            className={`flex-1 ${
              isConnected 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={onDisconnect}
            disabled={!isConnected || accountActionDisabled}
            data-testid={`button-disconnect-${id}`}
          >
            {disconnectButtonLabel}
          </Button>
        </div>

        {configureButton && configureButton}
      </div>
    </Card>
  );
}
