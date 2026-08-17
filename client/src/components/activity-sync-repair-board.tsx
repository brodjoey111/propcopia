import type { PositionSyncRepairCandidateFilter } from "@/lib/position-sync-queue";
import type { PositionSyncRepairBoardSummary, PositionSyncRepairCandidateEntry } from "@/lib/position-sync-queue";
import {
  describePositionSyncSimulationGuidance,
  type PositionSyncRepairSummaryView,
} from "@/lib/position-sync";
import type { PositionSyncWorkflowState } from "@/lib/position-sync-workflow";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ActivitySyncRepairBoardProps {
  repairCandidateSearch: string;
  onRepairCandidateSearchChange: (value: string) => void;
  repairCandidateFilter: PositionSyncRepairCandidateFilter;
  onRepairCandidateFilterChange: (value: PositionSyncRepairCandidateFilter) => void;
  positionSyncRepairCandidates: PositionSyncRepairCandidateEntry[];
  positionSyncRepairSummary: PositionSyncRepairSummaryView;
  positionSyncRepairBoardSummary: PositionSyncRepairBoardSummary;
  filteredRepairCandidates: PositionSyncRepairCandidateEntry[];
  selectedRepairCandidateKeys: string[];
  repairCandidateNotes: Record<string, string>;
  positionSyncWorkflowState: PositionSyncWorkflowState;
  isSaving: boolean;
  formatTimestamp: (timestamp: string) => string;
  onToggleSelection: (key: string) => void;
  onSelectVisible: () => void;
  onSelectAutoReady: () => void;
  onClearSelection: () => void;
  onBulkReview: () => void;
  onBulkSimulate: () => void;
  onBulkTakeOwnership: () => void;
  onBulkApprove: () => void;
  onRepairCandidateNoteChange: (key: string, value: string) => void;
  onSaveNote: (entry: PositionSyncRepairCandidateEntry) => void;
  onOpenInQueue: (entry: PositionSyncRepairCandidateEntry) => void;
}

export function ActivitySyncRepairBoard(props: ActivitySyncRepairBoardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,22,0.98),rgba(7,11,18,0.98))] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-100">Sync Repair Board</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Stage the next sync repair work</h2>
          <p className="mt-1 text-sm text-sky-100/80">
            Separate low-complexity repair candidates from plans that still need manual review before entering the operator workflow.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          {props.positionSyncRepairSummary.headline}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Input
          value={props.repairCandidateSearch}
          onChange={(event) => props.onRepairCandidateSearchChange(event.target.value)}
          placeholder="Search by group, follower, recommendation, or symbol"
          className="lg:max-w-[420px] border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "auto_ready", "ready_to_simulate", "manual_review", "not_started", "in_progress"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm ${
                props.repairCandidateFilter === filter
                  ? "border-sky-400/30 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-200"
              }`}
              onClick={() => props.onRepairCandidateFilterChange(filter)}
            >
              {filter === "all"
                ? `All (${props.positionSyncRepairCandidates.length})`
                : filter === "auto_ready"
                  ? `Auto-ready (${props.positionSyncRepairCandidates.filter((entry) => entry.recommendation === "auto_ready").length})`
                  : filter === "ready_to_simulate"
                    ? `Ready to Simulate (${props.positionSyncRepairCandidates.filter(
                        (entry) =>
                          entry.recommendation === "auto_ready" &&
                          entry.complexity === "low" &&
                          entry.workflowStatus === "reviewed",
                      ).length})`
                  : filter === "manual_review"
                    ? `Manual Review (${props.positionSyncRepairCandidates.filter((entry) => entry.recommendation === "manual_review").length})`
                    : filter === "not_started"
                      ? `Not Started (${props.positionSyncRepairCandidates.filter((entry) => entry.workflowStatus === "not_started").length})`
                      : `In Progress (${props.positionSyncRepairCandidates.filter((entry) => entry.workflowStatus !== "not_started" && entry.workflowStatus !== "completed_manually").length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-200"
          onClick={props.onSelectVisible}
        >
          Select visible
        </button>
        <button
          type="button"
          className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-100"
          onClick={props.onSelectAutoReady}
        >
          Select ready to simulate
        </button>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-200"
          onClick={props.onClearSelection}
        >
          Clear selection
        </button>
        <button
          type="button"
          className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-100"
          onClick={props.onBulkReview}
          disabled={props.selectedRepairCandidateKeys.length === 0 || props.isSaving}
        >
          Mark selected reviewed
        </button>
        <button
          type="button"
          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-100"
          onClick={props.onBulkSimulate}
          disabled={props.selectedRepairCandidateKeys.length === 0 || props.isSaving}
        >
          Simulate selected
        </button>
        <button
          type="button"
          className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-100"
          onClick={props.onBulkTakeOwnership}
          disabled={props.selectedRepairCandidateKeys.length === 0 || props.isSaving}
        >
          Take ownership of selected
        </button>
        <button
          type="button"
          className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm text-emerald-100"
          onClick={props.onBulkApprove}
          disabled={props.selectedRepairCandidateKeys.length === 0 || props.isSaving}
        >
          Approve selected
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">Auto-Ready</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.autoReady}</p>
          <p className="mt-1 text-sm text-emerald-100/80">Low-complexity candidates that can move first</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100">Manual Review</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.manualReview}</p>
          <p className="mt-1 text-sm text-amber-100/80">Candidates that still need operator judgment</p>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-rose-100">Needs Attention</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.needsAttention}</p>
          <p className="mt-1 text-sm text-rose-100/80">Reviewed, simulated, or approved items aging too long</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">Unowned</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.unowned}</p>
          <p className="mt-1 text-sm text-cyan-100/80">In-progress staged items without an owner</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sky-100">Low Complexity</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.lowComplexity}</p>
          <p className="mt-1 text-sm text-sky-100/80">Quick trim and sizing repairs</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100">Medium Complexity</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.mediumComplexity}</p>
          <p className="mt-1 text-sm text-amber-100/80">Multi-step or fresh-open repair plans</p>
        </div>
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-red-100">High Complexity</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.highComplexity}</p>
          <p className="mt-1 text-sm text-red-100/80">Reversal-heavy repairs that deserve extra care</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Workload Score</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.positionSyncRepairBoardSummary.totalComplexityScore}</p>
          <p className="mt-1 text-sm text-zinc-400">Weighted repair effort across the visible queue</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {props.filteredRepairCandidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-2">
            No sync repair candidates match the current search right now.
          </div>
        ) : (
          props.filteredRepairCandidates.map((entry) => (
            <div key={entry.key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={props.selectedRepairCandidateKeys.includes(entry.key)}
                    onChange={() => props.onToggleSelection(entry.key)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.followerName}</p>
                    <p className="mt-2 text-sm text-zinc-400">{entry.recommendationReason}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {describePositionSyncSimulationGuidance(entry.complexity)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {entry.stageGuidance}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      entry.recommendation === "auto_ready"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                    }`}
                  >
                    {entry.recommendationLabel}
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                    {entry.workflowLabel}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      entry.complexity === "high"
                        ? "border-red-400/30 bg-red-400/10 text-red-200"
                        : entry.complexity === "medium"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                          : "border-sky-400/30 bg-sky-400/10 text-sky-100"
                    }`}
                  >
                    {entry.complexityLabel}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                <span>{entry.adjustmentCount} adjustment{entry.adjustmentCount === 1 ? "" : "s"}</span>
                {entry.topAdjustments.length > 0 && (
                  <span>Symbols: {entry.topAdjustments.join(", ")}</span>
                )}
                {entry.operatorName && <span>Owner: {entry.operatorName}</span>}
                <span>
                  {entry.workflowTimestamp
                    ? `${entry.workflowTimestampLabel} on ${props.formatTimestamp(entry.workflowTimestamp)}`
                    : entry.workflowTimestampLabel}
                </span>
                {entry.workflowTimestamp && entry.workflowStatus !== "not_started" && (
                  <span>{entry.ageMinutes} min in current stage</span>
                )}
                {entry.needsAttention && entry.attentionLabel && (
                  <span className="text-amber-200">Alert: {entry.attentionLabel}</span>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <Input
                  value={props.repairCandidateNotes[entry.key] ?? props.positionSyncWorkflowState[entry.key]?.note ?? ""}
                  onChange={(event) => props.onRepairCandidateNoteChange(entry.key, event.target.value)}
                  placeholder="Shared repair-stage note"
                  className="border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                    onClick={() => props.onSaveNote(entry)}
                    disabled={props.isSaving}
                  >
                    {props.isSaving ? "Saving..." : "Save note"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                    onClick={() => props.onOpenInQueue(entry)}
                    disabled={props.isSaving}
                  >
                    {entry.workflowStatus === "not_started" ? "Start in queue" : "Open in queue"}
                  </Button>
                  {props.positionSyncWorkflowState[entry.key]?.note && (
                    <span className="text-xs text-zinc-500">
                      Current note saved to shared sync workflow.
                    </span>
                  )}
                </div>
              </div>

              {entry.stageHistory.length > 0 && (
                <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Stage Timeline
                  </p>
                  <div className="mt-2 space-y-2">
                    {entry.stageHistory.slice(0, 4).map((stage, index) => (
                      <div
                        key={`${entry.key}-stage-${index}`}
                        className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                      >
                        <p className="text-zinc-200">
                          {stage.label} on {props.formatTimestamp(stage.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(entry.operatorHistory?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    Ownership Timeline
                  </p>
                  <div className="mt-2 space-y-2">
                    {entry.operatorHistory?.slice(-3).reverse().map((assignment, index) => (
                      <div
                        key={`${entry.key}-assignment-${index}`}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
