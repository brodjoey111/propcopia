import type { PositionSyncQueueEntry, PositionSyncQueueFilter } from "@/lib/position-sync-queue";
import type { PositionSyncWorkflowSaveInput } from "@/lib/position-sync-workflow";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SyncQueueBoardView = "compact" | "detailed";
type QueueSort = "recent" | "age" | "owner" | "reassignments";
type QueueAuditFocus = "all" | "overdue" | "unassigned" | "reassigned";

interface ActivitySyncReviewBoardProps {
  queueSearch: string;
  onQueueSearchChange: (value: string) => void;
  syncQueueBoardView: SyncQueueBoardView;
  onSyncQueueBoardViewChange: (value: SyncQueueBoardView) => void;
  queueSort: QueueSort;
  onQueueSortChange: (value: QueueSort) => void;
  queueAuditFocus: QueueAuditFocus;
  onClearQueueAuditFocus: () => void;
  queueFilter: PositionSyncQueueFilter;
  onQueueFilterChange: (value: PositionSyncQueueFilter) => void;
  positionSyncQueue: PositionSyncQueueEntry[];
  sortedAuditFocusedQueue: PositionSyncQueueEntry[];
  reviewedSyncCount: number;
  simulatedSyncCount: number;
  approvedSyncCount: number;
  handedOffSyncCount: number;
  completedManuallySyncCount: number;
  assignmentReasons: Record<string, string>;
  isSaving: boolean;
  formatTimestamp: (timestamp: string) => string;
  getPositionSyncStatusLabel: (status: PositionSyncWorkflowSaveInput["status"]) => string;
  getPositionSyncStatusTone: (status: PositionSyncWorkflowSaveInput["status"]) => string;
  getPositionSyncStatusTimestamp: (entry: PositionSyncQueueEntry) => string | null;
  onAssignmentReasonChange: (key: string, value: string) => void;
  onApprove: (entry: PositionSyncQueueEntry) => void;
  onTakeOwnership: (entry: PositionSyncQueueEntry) => void;
  onHandOff: (entry: PositionSyncQueueEntry) => void;
  onComplete: (entry: PositionSyncQueueEntry) => void;
}

export function ActivitySyncReviewBoard(props: ActivitySyncReviewBoardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Sync Review Queue</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Shared review and simulation queue</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Track review progress from first check through operator handoff and manual completion.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:w-[360px]">
          <Input
            value={props.queueSearch}
            onChange={(event) => props.onQueueSearchChange(event.target.value)}
            placeholder="Search by group, follower, note, or symbol"
            className="border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
          />
          <div className="flex flex-wrap gap-2">
            {(["compact", "detailed"] as const).map((view) => (
              <button
                key={view}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  props.syncQueueBoardView === view
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-200"
                }`}
                onClick={() => props.onSyncQueueBoardViewChange(view)}
              >
                {view === "compact" ? "Compact view" : "Detailed view"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["recent", "age", "owner", "reassignments"] as const).map((sort) => (
              <button
                key={sort}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  props.queueSort === sort
                    ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-200"
                }`}
                onClick={() => props.onQueueSortChange(sort)}
              >
                {sort === "recent"
                  ? "Newest"
                  : sort === "age"
                    ? "Oldest First"
                    : sort === "owner"
                      ? "Owner"
                      : "Reassignments"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {props.queueAuditFocus !== "all" && (
              <button
                type="button"
                className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-sm text-amber-100"
                onClick={props.onClearQueueAuditFocus}
              >
                {props.queueAuditFocus === "overdue"
                  ? "Audit: Overdue"
                  : props.queueAuditFocus === "unassigned"
                    ? "Audit: Unassigned"
                    : "Audit: Reassigned"}
              </button>
            )}
            {(["all", "reviewed", "simulated", "approved", "handed_off", "completed_manually"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  props.queueFilter === filter
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-200"
                }`}
                onClick={() => props.onQueueFilterChange(filter)}
              >
                {filter === "all"
                  ? `All (${props.positionSyncQueue.length})`
                  : filter === "reviewed"
                    ? `Reviewed (${props.reviewedSyncCount})`
                    : filter === "simulated"
                      ? `Simulated (${props.simulatedSyncCount})`
                      : filter === "approved"
                        ? `Approved (${props.approvedSyncCount})`
                        : filter === "handed_off"
                          ? `Handed Off (${props.handedOffSyncCount})`
                          : `Completed (${props.completedManuallySyncCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {props.sortedAuditFocusedQueue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
            No sync review items match the current filters yet.
          </div>
        ) : (
          props.sortedAuditFocusedQueue.map((entry) => (
            <div key={entry.key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.followerName}</p>
                  <p className="mt-2 text-sm text-zinc-400">{entry.summary}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${props.getPositionSyncStatusTone(entry.status)}`}
                >
                  {props.getPositionSyncStatusLabel(entry.status)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                <span>{entry.adjustmentCount} adjustment{entry.adjustmentCount === 1 ? "" : "s"}</span>
                <span>{entry.ageMinutes} min in current stage</span>
                {entry.topAdjustments.length > 0 && <span>Symbols: {entry.topAdjustments.join(", ")}</span>}
              </div>

              {props.syncQueueBoardView === "detailed" ? (
                <p className="mt-3 text-xs text-zinc-400">Next step: {entry.stageGuidance}</p>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Compact view keeps the queue lighter. Switch to detailed view for step guidance, notes, and ownership history.
                </p>
              )}

              {props.syncQueueBoardView === "detailed" && entry.note && (
                <p className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-xs text-zinc-300">
                  Review note: {entry.note}
                </p>
              )}
              {entry.operatorName ? (
                <p className="mt-3 text-xs text-zinc-400">Operator owner: {entry.operatorName}</p>
              ) : (
                <p className="mt-3 text-xs text-amber-200">Operator owner: Unassigned</p>
              )}
              {entry.reassignmentCount > 0 && (
                <p className="mt-2 text-xs text-zinc-500">Ownership changes: {entry.reassignmentCount}</p>
              )}
              {entry.latestAssignmentReason && (
                <p className="mt-2 text-xs text-zinc-500">
                  Latest ownership reason: {entry.latestAssignmentReason}
                </p>
              )}
              {props.syncQueueBoardView === "detailed" && (entry.operatorHistory?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Ownership Timeline</p>
                  <div className="mt-2 space-y-2">
                    {entry.operatorHistory?.map((assignment, index) => (
                      <div
                        key={`${entry.key}-assignment-${index}`}
                        className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                      >
                        <p className="text-zinc-200">
                          {assignment.operatorName} on {props.formatTimestamp(assignment.assignedAt)}
                        </p>
                        {assignment.reason && <p className="mt-1 text-zinc-500">{assignment.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entry.needsAttention && entry.attentionLabel && (
                <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  Needs follow-up: {entry.attentionLabel}
                </p>
              )}

              {props.syncQueueBoardView === "detailed" &&
                (entry.status === "approved" || entry.status === "handed_off") && (
                  <Input
                    value={props.assignmentReasons[entry.key] ?? ""}
                    onChange={(event) => props.onAssignmentReasonChange(entry.key, event.target.value)}
                    placeholder="Optional ownership reason"
                    className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                  />
                )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(entry.status === "reviewed" || entry.status === "simulated") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                    onClick={() => props.onApprove(entry)}
                    disabled={props.isSaving}
                  >
                    {props.isSaving ? "Saving..." : "Approve for manual execution"}
                  </Button>
                )}
                {entry.status === "approved" && (
                  <>
                    {!entry.operatorName && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                        onClick={() => props.onTakeOwnership(entry)}
                        disabled={props.isSaving}
                      >
                        {props.isSaving ? "Saving..." : "Take ownership"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                      onClick={() => props.onHandOff(entry)}
                      disabled={props.isSaving}
                    >
                      {props.isSaving ? "Saving..." : "Hand off for manual execution"}
                    </Button>
                    <span className="text-xs text-emerald-300">Ready for operator-led manual execution review.</span>
                  </>
                )}
                {entry.status === "handed_off" && (
                  <>
                    {!entry.operatorName && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                        onClick={() => props.onTakeOwnership(entry)}
                        disabled={props.isSaving}
                      >
                        {props.isSaving ? "Saving..." : "Take ownership"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                      onClick={() => props.onComplete(entry)}
                      disabled={props.isSaving}
                    >
                      {props.isSaving ? "Saving..." : "Mark completed manually"}
                    </Button>
                    <span className="text-xs text-amber-200">Assigned to an operator for manual follow-through.</span>
                  </>
                )}
                {entry.status === "completed_manually" && (
                  <span className="text-xs text-emerald-300">Manual execution follow-through has been logged.</span>
                )}
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                {props.getPositionSyncStatusTimestamp(entry) ?? "Timestamp unavailable"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
