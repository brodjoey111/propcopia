import { Button } from "@/components/ui/button";
import { useState } from "react";

import { ExecutionFollowUpSignalSummary } from "@/components/execution-follow-up-signal-summary";
import { Input } from "@/components/ui/input";
import type { ExecutionFollowUpFilter } from "@/lib/follow-up-operator";
import type { ExecutionRecoveryFollowUpItem } from "@/lib/runtime-overview";

interface ActivityExecutionFollowUpBoardProps {
  executionFollowUpSearch: string;
  onExecutionFollowUpSearchChange: (value: string) => void;
  executionFollowUpFilter: ExecutionFollowUpFilter;
  onExecutionFollowUpFilterChange: (value: ExecutionFollowUpFilter) => void;
  executionFollowUpItems: ExecutionRecoveryFollowUpItem[];
  filteredExecutionFollowUpItems: ExecutionRecoveryFollowUpItem[];
  reviewedExecutionFollowUpCount: number;
  failedExecutionFollowUpCount: number;
  staleExecutionFollowUpCount: number;
  partialExecutionFollowUpCount: number;
  activeExecutionFollowUpCount: number;
  selectedExecutionFollowUpHistoryIds: string[];
  executionFollowUpNotes: Record<string, string>;
  formatTimestamp: (timestamp: string) => string;
  isRechecking: boolean;
  isSaving: boolean;
  onToggleSelection: (historyId: string) => void;
  onSelectVisible: () => void;
  onSelectFailed: () => void;
  onClearSelection: () => void;
  onBulkTakeOwnership: () => void;
  onBulkRecheck: () => void;
  onBulkReview: () => void;
  onBulkReopen: () => void;
  onNoteChange: (historyId: string, value: string) => void;
  onTakeOwnership: (historyId: string) => void;
  onSaveNote: (historyId: string) => void;
  onRecheck: (historyId: string) => void;
  onReview: (historyId: string) => void;
}

export function ActivityExecutionFollowUpBoard(
  props: ActivityExecutionFollowUpBoardProps,
) {
  const [boardView, setBoardView] = useState<"compact" | "detailed">("compact");

  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,22,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Execution Follow-Up</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Shared execution recovery queue</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Review failed, stale, partial, and active execution exceptions without leaving the operator workspace.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:w-[360px]">
          <Input
            value={props.executionFollowUpSearch}
            onChange={(event) => props.onExecutionFollowUpSearchChange(event.target.value)}
            placeholder="Search by symbol, follower, issue, or review note"
            className="border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
          />
          <div className="flex flex-wrap gap-2">
            {(["compact", "detailed"] as const).map((view) => (
              <Button
                key={view}
                type="button"
                size="sm"
                variant="outline"
                className={
                  boardView === view
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15"
                    : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                }
                onClick={() => setBoardView(view)}
              >
                {view === "compact" ? "Compact view" : "Detailed view"}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
              Reviewed {props.reviewedExecutionFollowUpCount}
            </span>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
              Failed {props.failedExecutionFollowUpCount}
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
              Stale {props.staleExecutionFollowUpCount}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              Partial {props.partialExecutionFollowUpCount}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-zinc-300">
              Active {props.activeExecutionFollowUpCount}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="xl:col-span-2 flex flex-wrap gap-2">
          {(["all", "open", "reviewed", "failed", "stale", "partial", "active"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm ${
                props.executionFollowUpFilter === filter
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-200"
              }`}
              onClick={() => props.onExecutionFollowUpFilterChange(filter)}
            >
              {filter === "all"
                ? `All (${props.executionFollowUpItems.length})`
                : filter === "open"
                  ? `Open (${props.executionFollowUpItems.length - props.reviewedExecutionFollowUpCount})`
                  : filter === "reviewed"
                    ? `Reviewed (${props.reviewedExecutionFollowUpCount})`
                    : filter === "failed"
                      ? `Failed (${props.failedExecutionFollowUpCount})`
                      : filter === "stale"
                        ? `Stale (${props.staleExecutionFollowUpCount})`
                        : filter === "partial"
                          ? `Partial (${props.partialExecutionFollowUpCount})`
                          : `Active (${props.activeExecutionFollowUpCount})`}
            </button>
          ))}
          {props.filteredExecutionFollowUpItems.length > 0 && (
            <>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onSelectVisible}>
                Select visible
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15" onClick={props.onSelectFailed}>
                Select failed only
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onClearSelection} disabled={props.selectedExecutionFollowUpHistoryIds.length === 0}>
                Clear selection
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onBulkTakeOwnership} disabled={props.selectedExecutionFollowUpHistoryIds.length === 0}>
                Take ownership of selected
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={props.onBulkRecheck} disabled={props.selectedExecutionFollowUpHistoryIds.length === 0}>
                Recheck selected
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15" onClick={props.onBulkReview} disabled={props.selectedExecutionFollowUpHistoryIds.length === 0}>
                Review failed selected
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15" onClick={props.onBulkReopen} disabled={props.selectedExecutionFollowUpHistoryIds.length === 0}>
                Reopen selected
              </Button>
            </>
          )}
        </div>
        {props.filteredExecutionFollowUpItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
            No execution follow-up items match the current search right now.
          </div>
        ) : (
          props.filteredExecutionFollowUpItems.map((item) => (
            <div key={item.historyId} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={props.selectedExecutionFollowUpHistoryIds.includes(item.historyId)}
                    onChange={() => props.onToggleSelection(item.historyId)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Select
                </label>
                <span className="text-xs text-zinc-500">{item.ageMinutes} min old</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.symbol}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.headline}</p>
                  <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
                  <ExecutionFollowUpSignalSummary
                    checkpoint={item.checkpoint}
                    recoveryWindow={item.recoveryWindow}
                    variant={boardView === "detailed" ? "detailed" : "compact"}
                  />
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    item.severity === "error"
                      ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                      : item.severity === "warn"
                        ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300"
                  }`}
                >
                  {item.category === "failed"
                    ? "Failure"
                    : item.category === "stale"
                      ? "Stale"
                      : item.category === "partial"
                        ? "Partial"
                        : "Active"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Follower: {item.followerAccountId}</span>
                <span>Recommended action: {item.actionLabel}</span>
                {item.operatorName && <span>Operator owner: {item.operatorName}</span>}
                {(item.operatorHistory?.length ?? 0) > 0 && (
                  <span>Ownership changes: {item.operatorHistory?.length}</span>
                )}
                {item.reviewedAt && <span>Reviewed at: {props.formatTimestamp(item.reviewedAt)}</span>}
              </div>

              {boardView === "detailed" && (item.operatorHistory?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Ownership Timeline
                  </p>
                  <div className="mt-2 space-y-2">
                    {item.operatorHistory?.slice(-3).reverse().map((assignment, index) => (
                      <div
                        key={`${item.historyId}-execution-owner-${index}`}
                        className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                      >
                        <p className="text-zinc-200">
                          {assignment.operatorName} on {props.formatTimestamp(assignment.assignedAt)}
                        </p>
                        {assignment.reason && (
                          <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {boardView === "detailed" ? (
                <Input
                  value={props.executionFollowUpNotes[item.historyId] ?? item.reviewNote ?? ""}
                  onChange={(event) => props.onNoteChange(item.historyId, event.target.value)}
                  placeholder="Execution review note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                  disabled={item.category !== "failed"}
                />
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Compact view keeps the queue lighter. Switch to detailed view for notes and ownership history.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={() => props.onTakeOwnership(item.historyId)}>
                  Take ownership
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={() => props.onSaveNote(item.historyId)}>
                  Save note
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={() => props.onRecheck(item.historyId)} disabled={props.isRechecking}>
                  Recheck
                </Button>
                {item.category === "failed" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={
                      item.reviewStatus === "reviewed"
                        ? "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    }
                    onClick={() => props.onReview(item.historyId)}
                    disabled={props.isSaving || item.reviewStatus === "reviewed"}
                  >
                    {item.reviewStatus === "reviewed" ? "Reviewed" : "Mark reviewed"}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
