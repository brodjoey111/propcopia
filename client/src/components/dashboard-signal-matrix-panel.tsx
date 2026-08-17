import { Cpu, ShieldCheck, Sparkles } from "lucide-react";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AccountRiskFollowUpItem } from "@/lib/account-risk";
import type { CopySessionSignalRow } from "@/lib/copy-groups";

interface DashboardSignalMatrixPanelProps {
  matrixRows: CopySessionSignalRow[];
  riskFollowUpItems: AccountRiskFollowUpItem[];
  usingMockData: boolean;
  followerHealthRows: Array<{
    accountId: string;
    name: string;
    health: "ready" | "reconnecting" | "unavailable";
  }>;
}

export function DashboardSignalMatrixPanel({
  matrixRows,
  riskFollowUpItems,
  usingMockData,
  followerHealthRows,
}: DashboardSignalMatrixPanelProps) {
  const [panelView, setPanelView] = useState<"compact" | "detailed">("compact");

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,11,16,0.98))] p-5 shadow-xl shadow-black/25">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Signal Matrix</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Connection and routing health</h2>
        </div>
        <Cpu className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["compact", "detailed"] as const).map((view) => (
          <Button
            key={view}
            type="button"
            variant="outline"
            size="sm"
            className={
              panelView === view
                ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15"
                : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
            }
            onClick={() => setPanelView(view)}
          >
            {view === "compact" ? "Compact view" : "Detailed view"}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {matrixRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{row.label}</p>
              <p className="mt-1 text-sm text-zinc-300">{row.value}</p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                row.state === "ok"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : row.state === "alert"
                    ? "bg-red-400/10 text-red-300"
                    : row.state === "watch"
                      ? "bg-amber-400/10 text-amber-300"
                      : "bg-white/[0.06] text-zinc-300"
              }`}
            >
              {row.state === "ok"
                ? "OK"
                : row.state === "alert"
                  ? "Alert"
                  : row.state === "watch"
                    ? "Watch"
                    : "Not started"}
            </div>
          </div>
        ))}
      </div>

      {riskFollowUpItems.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Risk Follow-Up</p>
              <p className="mt-1 text-sm text-zinc-400">
                Accounts that need a manual risk decision before the next copy session.
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
          </div>

          {riskFollowUpItems.map((item) => (
            <div
              key={item.accountId}
              className={`rounded-2xl border p-4 ${
                item.tone === "danger"
                  ? "border-red-500/20 bg-red-500/10"
                  : item.tone === "warn"
                    ? "border-amber-500/20 bg-amber-500/10"
                    : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.accountName}</p>
                  <p className="mt-1 text-xs text-zinc-300">{item.headline}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    item.tone === "danger"
                      ? "border-red-400/20 bg-red-400/10 text-red-300"
                      : item.tone === "warn"
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                        : "border-white/10 bg-white/[0.04] text-zinc-300"
                  }
                >
                  {item.status === "BREACHED"
                    ? "Hold"
                    : item.status === "WARN"
                      ? "Review"
                    : "Pending"}
                </Badge>
              </div>
              {panelView === "detailed" ? (
                <>
                  <p className="mt-3 text-sm text-zinc-300">{item.detail}</p>
                  <p className="mt-2 text-xs text-zinc-500">{item.recommendedAction}</p>
                </>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Compact view keeps routing status easy to scan. Switch to detailed view for the full risk follow-up context.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {panelView === "detailed" ? (
        <div className="mt-5 rounded-[24px] border border-white/8 bg-gradient-to-br from-cyan-400/10 via-transparent to-emerald-400/10 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Why this revamp is different</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                The layout now behaves more like a high-end operations board instead of a generic analytics dashboard.
              </p>
              {!usingMockData && followerHealthRows.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {followerHealthRows.slice(0, 3).map((follower) => (
                    <Badge
                      key={follower.accountId}
                      variant="outline"
                      className={
                        follower.health === "unavailable"
                          ? "border-red-400/30 bg-red-400/10 text-red-300"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      }
                    >
                      {follower.name}: {follower.health === "unavailable" ? "Needs attention" : "Reconnecting"}
                    </Badge>
                  ))}
                  {followerHealthRows.length > 3 && (
                    <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
                      +{followerHealthRows.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
