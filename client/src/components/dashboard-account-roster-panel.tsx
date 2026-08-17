import { Badge } from "@/components/ui/badge";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";

interface DashboardAccountRosterPanelAccount {
  id: string;
  name: string;
  accountId: string;
  platform: string;
  accountType: "master" | "follower";
  isConnected: boolean;
  balance: number;
  dailyPnl: number;
  unrealizedPnl: number;
  openPositions: number;
  positionScaling?: number;
  maxContracts?: number;
  blockedTickers?: string[];
  riskMode?: "global" | "custom";
  riskStatusLabel?: string;
  riskStatusTone?: "ok" | "warn" | "danger" | "muted";
}

interface DashboardAccountRosterPanelProps {
  usingMockData: boolean;
  showAccountRoster: boolean;
  dashboardAccounts: DashboardAccountRosterPanelAccount[];
  globalRiskSettings: {
    positionScaling: number;
    maxContracts?: number;
    blockedTickers: string[];
  };
  formatCurrency: (value: number) => string;
  getBackgroundGlow: (value: number) => string;
  onToggleRoster: () => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, accountName: string) => void;
  onConfigure: (accountId: string) => void;
}

export function DashboardAccountRosterPanel({
  usingMockData,
  showAccountRoster,
  dashboardAccounts,
  globalRiskSettings,
  formatCurrency,
  getBackgroundGlow,
  onToggleRoster,
  onConnect,
  onDisconnect,
  onConfigure,
}: DashboardAccountRosterPanelProps) {
  const [panelView, setPanelView] = useState<"compact" | "detailed">("compact");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Account Roster</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {usingMockData ? "Mock account command cards" : "Live account command cards"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {(["compact", "detailed"] as const).map((view) => (
              <Button
                key={view}
                variant="outline"
                size="sm"
                className={
                  panelView === view
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.04] text-zinc-300"
                }
                onClick={() => setPanelView(view)}
              >
                {view === "compact" ? "Compact view" : "Detailed view"}
              </Button>
            ))}
          </div>
          {!usingMockData && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/[0.04] text-zinc-300"
              onClick={onToggleRoster}
            >
              {showAccountRoster ? "Hide roster" : "Load roster"}
            </Button>
          )}
          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
            {usingMockData ? "UI preview data" : "live data"}
          </Badge>
        </div>
      </div>

      {!usingMockData && !showAccountRoster ? (
        <Card className="border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
          Load the account roster when you want detailed balance, P&amp;L, and per-account controls.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {dashboardAccounts.map((account) => {
            const isPositive = account.dailyPnl >= 0;
            const isUnrealizedPositive = account.unrealizedPnl >= 0;

            return (
              <Card
                key={account.id}
                className="relative overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getBackgroundGlow(account.dailyPnl)} opacity-100`} />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                        <Badge variant="outline" className="border-white/10 bg-white/[0.05] text-zinc-300 capitalize">
                          {account.accountType}
                        </Badge>
                        {account.riskMode && (
                          <Badge variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-300 capitalize">
                            {account.riskMode}
                          </Badge>
                        )}
                        {account.riskStatusLabel && (
                          <Badge
                            variant="outline"
                            className={
                              account.riskStatusTone === "ok"
                                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                : account.riskStatusTone === "warn"
                                  ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                                  : account.riskStatusTone === "danger"
                                    ? "border-red-400/20 bg-red-400/10 text-red-300"
                                    : "border-white/10 bg-white/[0.04] text-zinc-300"
                            }
                          >
                            {account.riskStatusLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">
                        {account.platform} • {account.accountId}
                      </p>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300">
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${account.isConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
                      {account.isConnected ? "Connected" : "Not connected"}
                    </div>
                  </div>

                  {panelView === "detailed" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Balance</p>
                          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(account.balance)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Open Positions</p>
                          <p className="mt-2 text-xl font-semibold text-white">{account.openPositions}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Daily P&amp;L</p>
                          <p className={`mt-2 text-xl font-semibold ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                            {account.dailyPnl >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(account.dailyPnl))}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Unrealized</p>
                          <p className={`mt-2 text-xl font-semibold ${isUnrealizedPositive ? "text-cyan-300" : "text-rose-300"}`}>
                            {account.unrealizedPnl >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(account.unrealizedPnl))}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {account.positionScaling !== undefined && (
                          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                            scaling {account.positionScaling}%
                          </Badge>
                        )}
                        {account.maxContracts !== undefined && (
                          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                            max {account.maxContracts} contracts
                          </Badge>
                        )}
                        {account.blockedTickers && account.blockedTickers.length > 0 && (
                          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                            {account.blockedTickers.length} blocked
                          </Badge>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs text-zinc-500">
                        Compact view keeps the roster lighter. Switch to detailed view for balance, P&amp;L, and account controls context.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <span className="text-zinc-300">Balance: {formatCurrency(account.balance)}</span>
                        <span className="text-zinc-300">Open Positions: {account.openPositions}</span>
                        <span className={isPositive ? "text-emerald-300" : "text-rose-300"}>
                          Daily P&amp;L: {account.dailyPnl >= 0 ? "+" : "-"}{formatCurrency(Math.abs(account.dailyPnl))}
                        </span>
                      </div>
                    </div>
                  )}

                  {!usingMockData && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <Button
                        size="sm"
                        className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                        onClick={() => onConnect(account.id)}
                        disabled={account.isConnected}
                      >
                        Connect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 bg-white/[0.04] text-zinc-300"
                        onClick={() => onDisconnect(account.id, account.name)}
                        disabled={!account.isConnected}
                      >
                        Disconnect
                      </Button>
                      {account.accountType === "follower" ? (
                        <ConfigureAccountDialog
                          accountId={account.id}
                          accountName={account.name}
                          riskMode={account.riskMode || "global"}
                          positionScaling={account.positionScaling || 100}
                          maxContracts={account.maxContracts || undefined}
                          blockedTickers={account.blockedTickers || []}
                          globalSettings={globalRiskSettings}
                          onSave={() => onConfigure(account.id)}
                        >
                          <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                            Configure
                          </Button>
                        </ConfigureAccountDialog>
                      ) : (
                        <div className="hidden md:block" />
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
