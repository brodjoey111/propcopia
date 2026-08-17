import { Button } from "@/components/ui/button";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { RiskFollowUpFilter, RiskFollowUpItemView } from "@/lib/follow-up-operator";

interface ActivityRiskFollowUpBoardProps {
  riskFollowUpSearch: string;
  onRiskFollowUpSearchChange: (value: string) => void;
  riskFollowUpFilter: RiskFollowUpFilter;
  onRiskFollowUpFilterChange: (value: RiskFollowUpFilter) => void;
  riskFollowUpItems: RiskFollowUpItemView[];
  filteredRiskFollowUpItems: RiskFollowUpItemView[];
  reviewedRiskFollowUpCount: number;
  ownedRiskFollowUpCount: number;
  unownedRiskFollowUpCount: number;
  reassignedRiskFollowUpCount: number;
  selectedRiskFollowUpAccountIds: string[];
  riskFollowUpNotes: Record<string, string>;
  formatTimestamp: (timestamp: string) => string;
  onToggleSelection: (accountId: string) => void;
  onSelectVisible: () => void;
  onSelectUnowned: () => void;
  onClearSelection: () => void;
  onBulkTakeOwnership: () => void;
  onBulkMarkReviewed: () => void;
  onBulkReopen: () => void;
  onNoteChange: (accountId: string, value: string) => void;
  onTakeOwnership: (accountId: string) => void;
  onSaveNote: (accountId: string) => void;
  onToggleReviewed: (accountId: string, reviewed: boolean) => void;
}

export function ActivityRiskFollowUpBoard(
  props: ActivityRiskFollowUpBoardProps,
) {
  const [boardView, setBoardView] = useState<"compact" | "detailed">("compact");

  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,22,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Risk Follow-Up</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Shared risk review queue</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Work breached, warning, and pending-risk accounts with shared ownership and review notes.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:w-[360px]">
          <Input
            value={props.riskFollowUpSearch}
            onChange={(event) => props.onRiskFollowUpSearchChange(event.target.value)}
            placeholder="Search by account, issue, owner, or note"
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
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
              Reviewed {props.reviewedRiskFollowUpCount}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              Owned {props.ownedRiskFollowUpCount}
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
              Unowned {props.unownedRiskFollowUpCount}
            </span>
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-100">
              Reassigned {props.reassignedRiskFollowUpCount}
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
                props.riskFollowUpFilter === filter
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-200"
              }`}
              onClick={() => props.onRiskFollowUpFilterChange(filter)}
            >
              {filter === "all"
                ? `All (${props.riskFollowUpItems.length})`
                : filter === "open"
                  ? `Open (${props.riskFollowUpItems.length - props.reviewedRiskFollowUpCount})`
                  : filter === "reviewed"
                    ? `Reviewed (${props.reviewedRiskFollowUpCount})`
                    : filter === "owned"
                      ? `Owned (${props.ownedRiskFollowUpCount})`
                      : filter === "unowned"
                        ? `Unowned (${props.unownedRiskFollowUpCount})`
                        : `Reassigned (${props.reassignedRiskFollowUpCount})`}
            </button>
          ))}
          {props.filteredRiskFollowUpItems.length > 0 && (
            <>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onSelectVisible}>
                Select visible
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15" onClick={props.onSelectUnowned}>
                Select unowned
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onClearSelection} disabled={props.selectedRiskFollowUpAccountIds.length === 0}>
                Clear selection
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={props.onBulkTakeOwnership} disabled={props.selectedRiskFollowUpAccountIds.length === 0}>
                Take ownership of selected
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15" onClick={props.onBulkMarkReviewed} disabled={props.selectedRiskFollowUpAccountIds.length === 0}>
                Mark selected reviewed
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15" onClick={props.onBulkReopen} disabled={props.selectedRiskFollowUpAccountIds.length === 0}>
                Reopen selected
              </Button>
            </>
          )}
        </div>
        {props.filteredRiskFollowUpItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
            No risk follow-up items match the current search right now.
          </div>
        ) : (
          props.filteredRiskFollowUpItems.map((item) => (
            <div key={item.accountId} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={props.selectedRiskFollowUpAccountIds.includes(item.accountId)}
                    onChange={() => props.onToggleSelection(item.accountId)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  Select
                </label>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.accountName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.headline}</p>
                  <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    item.tone === "danger"
                      ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                      : item.tone === "warn"
                        ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300"
                  }`}
                >
                  {item.status === "BREACHED" ? "Hold" : item.status === "WARN" ? "Review" : "Pending"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Recommended action: {item.recommendedAction}</span>
                {item.notificationTimestamp && (
                  <span>Alerted at: {props.formatTimestamp(item.notificationTimestamp)}</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                {item.review?.operatorName && (
                  <span>Operator owner: {item.review.operatorName}</span>
                )}
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
                        key={`${item.accountId}-risk-owner-${index}`}
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
                  value={props.riskFollowUpNotes[item.accountId] ?? item.review?.note ?? ""}
                  onChange={(event) => props.onNoteChange(item.accountId, event.target.value)}
                  placeholder="Shared risk note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Compact view keeps the queue lighter. Switch to detailed view for notes and ownership history.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={() => props.onTakeOwnership(item.accountId)}>
                  Take ownership
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15" onClick={() => props.onSaveNote(item.accountId)}>
                  Save note
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
                  onClick={() => props.onToggleReviewed(item.accountId, item.review?.status === "reviewed")}
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
