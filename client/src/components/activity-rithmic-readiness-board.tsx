import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  RithmicReadinessFollowUpFilter,
  RithmicReadinessFollowUpItemView,
} from "@/lib/follow-up-operator";

interface ActivityRithmicReadinessBoardProps {
  rithmicReadinessSearch: string;
  onRithmicReadinessSearchChange: (value: string) => void;
  rithmicReadinessFilter: RithmicReadinessFollowUpFilter;
  onRithmicReadinessFilterChange: (value: RithmicReadinessFollowUpFilter) => void;
  rithmicReadinessItems: RithmicReadinessFollowUpItemView[];
  filteredRithmicReadinessItems: RithmicReadinessFollowUpItemView[];
  reviewedRithmicReadinessCount: number;
  ownedRithmicReadinessCount: number;
  unownedRithmicReadinessCount: number;
  reassignedRithmicReadinessCount: number;
  selectedRithmicReadinessStoryKeys: string[];
  rithmicReadinessNotes: Record<string, string>;
  formatTimestamp: (timestamp: string) => string;
  isSaving: boolean;
  isRechecking: boolean;
  recheckingAccountId?: string;
  onToggleSelection: (storyKey: string) => void;
  onSelectVisible: () => void;
  onSelectUnowned: () => void;
  onClearSelection: () => void;
  onBulkTakeOwnership: () => void;
  onBulkRecheck: () => void;
  onBulkMarkReviewed: () => void;
  onBulkReopen: () => void;
  onNoteChange: (storyKey: string, value: string) => void;
  onTakeOwnership: (storyKey: string) => void;
  onSaveNote: (storyKey: string) => void;
  onRecheck: (storyKey: string) => void;
  onToggleReviewed: (storyKey: string, reviewed: boolean) => void;
}

export function ActivityRithmicReadinessBoard(
  props: ActivityRithmicReadinessBoardProps,
) {
  const [boardView, setBoardView] = useState<"compact" | "detailed">("compact");

  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,22,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Rithmic Readiness</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Shared reconnect and review queue</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Track saved-account reconnect proof and review notes before relying on the next Rithmic session.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:w-[360px]">
          <Input
            value={props.rithmicReadinessSearch}
            onChange={(event) => props.onRithmicReadinessSearchChange(event.target.value)}
            placeholder="Search by account, blocker, owner, or note"
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
              Reviewed {props.reviewedRithmicReadinessCount}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              Owned {props.ownedRithmicReadinessCount}
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
              Unowned {props.unownedRithmicReadinessCount}
            </span>
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-100">
              Reassigned {props.reassignedRithmicReadinessCount}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="xl:col-span-2 flex flex-wrap gap-2">
          {(["all", "open", "reviewed", "owned", "unowned", "reassigned"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm ${
                props.rithmicReadinessFilter === filter
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-200"
              }`}
              onClick={() => props.onRithmicReadinessFilterChange(filter)}
            >
              {filter === "all"
                ? `All (${props.rithmicReadinessItems.length})`
                : filter === "open"
                  ? `Open (${props.rithmicReadinessItems.length - props.reviewedRithmicReadinessCount})`
                  : filter === "reviewed"
                    ? `Reviewed (${props.reviewedRithmicReadinessCount})`
                    : filter === "owned"
                      ? `Owned (${props.ownedRithmicReadinessCount})`
                      : filter === "unowned"
                        ? `Unowned (${props.unownedRithmicReadinessCount})`
                        : `Reassigned (${props.reassignedRithmicReadinessCount})`}
            </button>
          ))}
          {props.filteredRithmicReadinessItems.length > 0 && (
            <>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onSelectVisible}>
                Select visible
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15" onClick={props.onSelectUnowned}>
                Select unowned
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onClearSelection} disabled={props.selectedRithmicReadinessStoryKeys.length === 0}>
                Clear selection
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={props.onBulkTakeOwnership} disabled={props.selectedRithmicReadinessStoryKeys.length === 0 || props.isSaving}>
                Take ownership of selected
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15" onClick={props.onBulkRecheck} disabled={props.selectedRithmicReadinessStoryKeys.length === 0 || props.isRechecking}>
                Re-check selected
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15" onClick={props.onBulkMarkReviewed} disabled={props.selectedRithmicReadinessStoryKeys.length === 0 || props.isSaving}>
                Mark selected reviewed
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15" onClick={props.onBulkReopen} disabled={props.selectedRithmicReadinessStoryKeys.length === 0 || props.isSaving}>
                Reopen selected
              </Button>
            </>
          )}
        </div>

        {props.filteredRithmicReadinessItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
            No Rithmic readiness items match the current search right now.
          </div>
        ) : (
          props.filteredRithmicReadinessItems.map((item) => (
            <div key={item.storyKey} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={props.selectedRithmicReadinessStoryKeys.includes(item.storyKey)}
                    onChange={() => props.onToggleSelection(item.storyKey)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Select
                </label>
                <span className="text-xs text-zinc-500">{props.formatTimestamp(item.timestamp)}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.accountName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.title}</p>
                  <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    item.severity === "error"
                      ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                      : "border-amber-400/30 bg-amber-400/15 text-amber-100"
                  }`}
                >
                  {item.severity === "error" ? "Needs review" : "Reconnect proof"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Recommended action: {item.actionLabel}</span>
                {item.review?.operatorName && <span>Operator owner: {item.review.operatorName}</span>}
                {(item.review?.operatorHistory?.length ?? 0) > 0 && (
                  <span>Ownership changes: {item.review?.operatorHistory?.length}</span>
                )}
                {item.review?.reviewedAt && (
                  <span>Reviewed at: {props.formatTimestamp(item.review.reviewedAt)}</span>
                )}
              </div>

              {boardView === "detailed" && (item.review?.operatorHistory?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Ownership Timeline
                  </p>
                  <div className="mt-2 space-y-2">
                    {item.review?.operatorHistory?.slice(-3).reverse().map((assignment, index) => (
                      <div
                        key={`${item.storyKey}-rithmic-owner-${index}`}
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
                  value={props.rithmicReadinessNotes[item.storyKey] ?? item.review?.note ?? ""}
                  onChange={(event) => props.onNoteChange(item.storyKey, event.target.value)}
                  placeholder="Shared reconnect review note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Compact view keeps the queue lighter. Switch to detailed view for notes and ownership history.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={() => props.onTakeOwnership(item.storyKey)} disabled={props.isSaving}>
                  Take ownership
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={() => props.onSaveNote(item.storyKey)} disabled={props.isSaving}>
                  Save note
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-sky-400/20 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15"
                  onClick={() => props.onRecheck(item.storyKey)}
                  disabled={props.isRechecking}
                >
                  {props.isRechecking && props.recheckingAccountId === item.accountId
                    ? "Re-checking..."
                    : "Re-check readiness"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={
                    item.review?.status === "reviewed"
                      ? "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                  }
                  onClick={() => props.onToggleReviewed(item.storyKey, item.review?.status === "reviewed")}
                  disabled={props.isSaving}
                >
                  {item.review?.status === "reviewed" ? "Reopen" : "Mark reviewed"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
