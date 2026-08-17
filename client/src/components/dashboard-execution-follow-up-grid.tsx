import { useState, type Dispatch, type SetStateAction } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExecutionFollowUpSignalSummary } from "@/components/execution-follow-up-signal-summary";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardRuntimeOverviewResponse, ExecutionRecoveryFollowUpItem } from "@/lib/runtime-overview";

interface DashboardExecutionFollowUpGridProps {
  authUsername?: string;
  executionFollowUpItems: ExecutionRecoveryFollowUpItem[];
  executionRecovery: NonNullable<DashboardRuntimeOverviewResponse["tradeAnalytics"]>["executionRecovery"];
  reviewNotes: Record<string, string>;
  setReviewNotes: Dispatch<SetStateAction<Record<string, string>>>;
  isSavingReview: boolean;
  isRecheckingItem: boolean;
  recheckingHistoryId?: string;
  onTakeOwnership: (item: ExecutionRecoveryFollowUpItem) => void;
  onSaveNote: (item: ExecutionRecoveryFollowUpItem) => void;
  onRecheck: (historyId: string) => void;
  onReview: (item: ExecutionRecoveryFollowUpItem) => void;
  onReopen: (item: ExecutionRecoveryFollowUpItem) => void;
}

export function DashboardExecutionFollowUpGrid(
  props: DashboardExecutionFollowUpGridProps,
) {
  const [boardView, setBoardView] = useState<"compact" | "detailed">("compact");

  if (props.executionFollowUpItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {(["compact", "detailed"] as const).map((view) => (
          <Button
            key={view}
            type="button"
            variant="outline"
            size="sm"
            className={
              boardView === view
                ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15"
                : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
            }
            onClick={() => setBoardView(view)}
          >
            {view === "compact" ? "Compact view" : "Detailed view"}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
      {props.executionFollowUpItems.map((item) => (
        <div key={item.historyId} className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{item.symbol}</p>
              <p className="mt-1 text-xs text-zinc-400">{item.followerAccountId}</p>
            </div>
            <Badge
              variant="outline"
              className={
                item.category === "failed"
                  ? "border-red-400/30 bg-red-400/10 text-red-200"
                  : item.category === "stale"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : item.category === "partial"
                      ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              }
            >
              {item.headline}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-zinc-300">{item.detail}</p>
          <ExecutionFollowUpSignalSummary
            checkpoint={item.checkpoint}
            recoveryWindow={item.recoveryWindow}
            variant={boardView === "detailed" ? "detailed" : "compact"}
          />
          {boardView === "detailed" && item.category === "failed" && item.reviewStatus !== "reviewed" ? (
            <div className="mt-3">
              <Textarea
                value={props.reviewNotes[item.historyId] ?? ""}
                onChange={(event) =>
                  props.setReviewNotes((current) => ({
                    ...current,
                    [item.historyId]: event.target.value,
                  }))
                }
                placeholder="Add a short review note before marking this failure reviewed"
                className="min-h-[88px] border-white/10 bg-white/[0.03] text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          ) : null}
          {boardView === "detailed" && item.category !== "failed" ? (
            <div className="mt-3">
              <Textarea
                value={props.reviewNotes[item.historyId] ?? item.reviewNote ?? ""}
                onChange={(event) =>
                  props.setReviewNotes((current) => ({
                    ...current,
                    [item.historyId]: event.target.value,
                  }))
                }
                placeholder="Add a shared execution note"
                className="min-h-[72px] border-white/10 bg-white/[0.03] text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          ) : null}
          {boardView === "compact" ? (
            <p className="mt-3 text-xs text-zinc-500">
              Compact view keeps the dashboard lighter. Switch to detailed view for notes and ownership history.
            </p>
          ) : null}
          <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300">
            {item.actionLabel}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
            {item.operatorName ? (
              <span>Operator owner: {item.operatorName}</span>
            ) : (
              <span>Operator owner: Unassigned</span>
            )}
            {(item.operatorHistory?.length ?? 0) > 0 ? (
              <span>Ownership changes: {item.operatorHistory?.length}</span>
            ) : null}
          </div>
          {item.reviewStatus === "reviewed" ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-emerald-300">
                Reviewed{item.reviewedAt ? ` at ${new Date(item.reviewedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}.
              </p>
              {item.reviewNote ? (
                <p className="text-xs text-zinc-400">{item.reviewNote}</p>
              ) : null}
            </div>
          ) : null}
          {boardView === "detailed" && (item.operatorHistory?.length ?? 0) > 0 ? (
            <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Ownership Timeline
              </p>
              <div className="mt-2 space-y-2">
                {item.operatorHistory?.slice(-3).reverse().map((assignment, index) => (
                  <div
                    key={`${item.historyId}-dashboard-owner-${index}`}
                    className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                  >
                    <p className="text-zinc-200">
                      {assignment.operatorName} on {new Date(assignment.assignedAt).toLocaleString()}.
                    </p>
                    {assignment.reason ? (
                      <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                onClick={() => props.onTakeOwnership(item)}
              >
                {item.operatorName === props.authUsername ? "Refresh owner" : "Take ownership"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                onClick={() => props.onSaveNote(item)}
              >
                Save note
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                onClick={() => props.onRecheck(item.historyId)}
                disabled={props.isRecheckingItem}
              >
                {props.isRecheckingItem && props.recheckingHistoryId === item.historyId
                  ? "Rechecking item..."
                  : "Recheck This Execution"}
              </Button>
              {item.category === "failed" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                  onClick={() =>
                    item.reviewStatus === "reviewed"
                      ? props.onReopen(item)
                      : props.onReview(item)
                  }
                  disabled={props.isSavingReview}
                >
                  {props.isSavingReview
                    ? "Saving review..."
                    : item.reviewStatus === "reviewed"
                      ? "Reopen"
                      : "Mark Reviewed"}
                </Button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            {item.lifecycleStatus.replaceAll("_", " ")} | {item.ageMinutes}m ago
          </p>
        </div>
      ))}
      </div>
    </div>
  );
}
