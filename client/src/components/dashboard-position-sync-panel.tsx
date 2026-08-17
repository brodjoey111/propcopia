import { Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { describePositionSyncSimulationGuidance } from "@/lib/position-sync";
import type {
  DashboardPositionSyncCard,
  DashboardPositionSyncOverviewGroup,
  DashboardPositionSyncPulse,
  DashboardPositionSyncReviewGroup,
} from "@/hooks/use-dashboard-position-sync-data";
import type { PositionSyncRepairBoardSummary, PositionSyncRepairCandidateEntry } from "@/lib/position-sync-queue";
import {
  buildPositionSyncWorkflowKey,
  type PositionSyncWorkflowState,
} from "@/lib/position-sync-workflow";

interface DashboardPositionSyncPanelProps {
  usingMockData: boolean;
  positionSyncPulse: DashboardPositionSyncPulse;
  positionSyncRepairSummary: {
    headline: string;
    detail: string;
  };
  positionSyncCards: DashboardPositionSyncCard[];
  positionSyncRepairBoardSummary: PositionSyncRepairBoardSummary;
  positionSyncRepairAttentionItems: PositionSyncRepairCandidateEntry[];
  showPositionSyncDetail: boolean;
  onToggleDetail: () => void;
  positionSyncSummaryGroups: DashboardPositionSyncOverviewGroup[];
  positionSyncPlanGroups: DashboardPositionSyncOverviewGroup[];
  positionSyncReviewGroups: DashboardPositionSyncReviewGroup[];
  selectedPositionSyncGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  positionSyncWorkflowState: PositionSyncWorkflowState;
  positionSyncReviewNotes: Record<string, string>;
  onPositionSyncReviewNoteChange: (workflowKey: string, value: string) => void;
  onPositionSyncSimulation: (groupId: string) => void;
  onPositionSyncReview: (groupId: string, followerAccountId: string) => void;
  onRepairCandidateTakeOwnership: (entry: PositionSyncRepairCandidateEntry) => void;
  onRepairCandidateAdvance: (entry: PositionSyncRepairCandidateEntry) => void;
}

export function DashboardPositionSyncPanel({
  usingMockData,
  positionSyncPulse,
  positionSyncRepairSummary,
  positionSyncCards,
  positionSyncRepairBoardSummary,
  positionSyncRepairAttentionItems,
  showPositionSyncDetail,
  onToggleDetail,
  positionSyncSummaryGroups,
  positionSyncPlanGroups,
  positionSyncReviewGroups,
  selectedPositionSyncGroupId,
  onSelectGroup,
  positionSyncWorkflowState,
  positionSyncReviewNotes,
  onPositionSyncReviewNoteChange,
  onPositionSyncSimulation,
  onPositionSyncReview,
  onRepairCandidateTakeOwnership,
  onRepairCandidateAdvance,
}: DashboardPositionSyncPanelProps) {
  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5 shadow-xl shadow-black/25">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Position Sync</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{positionSyncPulse.headline}</h2>
          <p className="mt-2 text-sm text-zinc-400">{positionSyncPulse.detail}</p>
          <p className="mt-2 text-sm text-zinc-500">
            {positionSyncRepairSummary.headline}. {positionSyncRepairSummary.detail}
          </p>
        </div>
        <Gauge className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {positionSyncCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{card.label}</p>
            <p
              className={`mt-2 text-xl font-semibold ${
                card.tone === "danger"
                  ? "text-red-300"
                  : card.tone === "warn"
                    ? "text-amber-300"
                    : card.tone === "ok"
                      ? "text-emerald-300"
                      : "text-zinc-200"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100">Ready to Simulate</p>
          <p className="mt-2 text-xl font-semibold text-white">{positionSyncRepairBoardSummary.readyToSimulate}</p>
          <p className="mt-1 text-xs text-emerald-100/80">Low-complexity reviewed repairs ready for the next simulation pass</p>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-rose-100">Staged Alerts</p>
          <p className="mt-2 text-xl font-semibold text-white">{positionSyncRepairBoardSummary.needsAttention}</p>
          <p className="mt-1 text-xs text-rose-100/80">Repair candidates aging in reviewed, simulated, or approved stages</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100">Unowned</p>
          <p className="mt-2 text-xl font-semibold text-white">{positionSyncRepairBoardSummary.unowned}</p>
          <p className="mt-1 text-xs text-cyan-100/80">In-progress staged sync candidates without an operator owner</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-red-100">High Complexity</p>
          <p className="mt-2 text-xl font-semibold text-white">{positionSyncRepairBoardSummary.highComplexity}</p>
          <p className="mt-1 text-xs text-red-100/80">Reversal-heavy sync plans still in the queue</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">Workload Score</p>
          <p className="mt-2 text-xl font-semibold text-white">{positionSyncRepairBoardSummary.totalComplexityScore}</p>
          <p className="mt-1 text-xs text-zinc-400">Weighted effort across staged sync repairs</p>
        </div>
      </div>

      {positionSyncRepairAttentionItems.length > 0 && (
        <div className="mt-4 space-y-2">
          {positionSyncRepairAttentionItems.map((entry) => (
            <div key={entry.key} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                  <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {entry.workflowTimestamp
                      ? `${entry.workflowTimestampLabel} on ${new Date(entry.workflowTimestamp).toLocaleString()}`
                      : entry.workflowTimestampLabel}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">{entry.stageGuidance}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {entry.needsAttention && entry.attentionLabel && (
                    <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">
                      {entry.attentionLabel}
                    </Badge>
                  )}
                  {!entry.operatorName && entry.workflowStatus !== "not_started" && entry.workflowStatus !== "completed_manually" && (
                    <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
                      Owner needed
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      entry.complexity === "high"
                        ? "border-red-400/30 bg-red-400/10 text-red-200"
                        : entry.complexity === "medium"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                    }
                  >
                    {entry.complexityLabel}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.workflowStatus !== "completed_manually" && !entry.operatorName && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                    onClick={() => onRepairCandidateTakeOwnership(entry)}
                  >
                    Take ownership
                  </Button>
                )}
                {(entry.workflowStatus === "not_started" ||
                  entry.workflowStatus === "reviewed" ||
                  entry.workflowStatus === "simulated") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    onClick={() => onRepairCandidateAdvance(entry)}
                  >
                    {entry.workflowStatus === "not_started"
                      ? "Start review"
                      : entry.workflowStatus === "reviewed"
                        ? "Simulate"
                        : "Approve"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/[0.03] text-xs text-zinc-200 hover:bg-white/[0.08]"
            onClick={onToggleDetail}
          >
            {showPositionSyncDetail ? "Hide sync detail" : "Load sync detail"}
          </Button>
        </div>

        {showPositionSyncDetail ? (
          <>
            <div className="space-y-3">
              {!usingMockData && positionSyncSummaryGroups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {positionSyncSummaryGroups.slice(0, 4).map((group) => (
                    <Button
                      key={group.groupId}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={
                        selectedPositionSyncGroupId === group.groupId
                          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-white/[0.03] text-zinc-300"
                      }
                      onClick={() => onSelectGroup(group.groupId)}
                    >
                      {group.groupName}
                    </Button>
                  ))}
                  {selectedPositionSyncGroupId && positionSyncSummaryGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-zinc-200"
                      onClick={() => onSelectGroup(null)}
                    >
                      Show all groups
                    </Button>
                  )}
                </div>
              )}

              {positionSyncSummaryGroups.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-zinc-400">
                  Position alignment will appear here after copy groups and live snapshots are available.
                </div>
              ) : (
                positionSyncSummaryGroups.slice(0, 3).map((group) => (
                  <div key={group.groupId} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{group.groupName}</p>
                        <p className="mt-1 text-sm text-zinc-400">{group.summary}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!usingMockData && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-zinc-200"
                            onClick={() => onSelectGroup(group.groupId)}
                          >
                            Inspect plan
                          </Button>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            group.status === "OUT_OF_SYNC"
                              ? "border-red-400/30 bg-red-400/10 text-red-300"
                              : group.status === "UNAVAILABLE"
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          }
                        >
                          {group.status === "OUT_OF_SYNC"
                            ? "Adjustments needed"
                            : group.status === "UNAVAILABLE"
                              ? "Waiting on positions"
                              : "In sync"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!usingMockData && positionSyncPlanGroups.length > 0 && (
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-zinc-300">
                {selectedPositionSyncGroupId
                  ? "Focused plan view is showing one copy group at a time."
                  : "Review is showing all copy groups with live sync plans."}
              </div>
            )}

            {positionSyncReviewGroups.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {positionSyncReviewGroups.map((group) => (
                  <div key={group.groupId} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{group.groupName}</p>
                        <p className="mt-1 text-xs text-zinc-500">Master: {group.masterAccountName}</p>
                        <p className="mt-2 text-sm text-zinc-400">{group.summary}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          group.status === "OUT_OF_SYNC"
                            ? "border-red-400/30 bg-red-400/10 text-red-300"
                            : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        }
                      >
                        {group.status === "OUT_OF_SYNC" ? "Review plan" : "Waiting"}
                      </Badge>
                    </div>

                    {!usingMockData && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15"
                          onClick={() => onPositionSyncSimulation(group.groupId)}
                        >
                          Simulate sync
                        </Button>
                        <p className="text-xs text-zinc-500">
                          Simulation markers are shared across signed-in sessions and do not send broker orders.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 space-y-3">
                      {group.followers.slice(0, 2).map((follower) => {
                        const workflowKey = buildPositionSyncWorkflowKey(group.groupId, follower.followerAccountId);
                        const workflowEntry = positionSyncWorkflowState[workflowKey];

                        return (
                          <div key={follower.followerAccountId} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">{follower.followerName}</p>
                                <p className="mt-1 text-xs text-zinc-400">{follower.summary}</p>
                                {follower.repairRecommendation && (
                                  <p className="mt-2 text-xs text-zinc-500">
                                    {follower.repairRecommendation.reason}
                                  </p>
                                )}
                                {follower.repairRecommendation && (
                                  <p className="mt-1 text-xs text-zinc-600">
                                    {describePositionSyncSimulationGuidance(follower.repairRecommendation.complexity)}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {workflowEntry?.status === "reviewed" && (
                                  <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                                    Reviewed
                                  </Badge>
                                )}
                                {workflowEntry?.status === "approved" && (
                                  <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                                    Approved
                                  </Badge>
                                )}
                                {workflowEntry?.status === "handed_off" && (
                                  <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">
                                    Handed Off
                                  </Badge>
                                )}
                                {workflowEntry?.status === "completed_manually" && (
                                  <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/15 text-emerald-100">
                                    Completed Manually
                                  </Badge>
                                )}
                                {workflowEntry?.status === "simulated" && (
                                  <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                                    Simulated safely
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={
                                    follower.status === "OUT_OF_SYNC"
                                      ? "border-red-400/30 bg-red-400/10 text-red-300"
                                      : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                                  }
                                >
                                  {follower.status === "OUT_OF_SYNC"
                                    ? `${follower.adjustmentCount} adjustment${follower.adjustmentCount === 1 ? "" : "s"}`
                                    : "Waiting"}
                                </Badge>
                                {follower.repairRecommendation && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      follower.repairRecommendation.tone === "ok"
                                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                        : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                                    }
                                  >
                                    {follower.repairRecommendation.label}
                                  </Badge>
                                )}
                                {follower.repairRecommendation && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      follower.repairRecommendation.complexity === "high"
                                        ? "border-red-400/30 bg-red-400/10 text-red-200"
                                        : follower.repairRecommendation.complexity === "medium"
                                          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                                          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                                    }
                                  >
                                    {follower.repairRecommendation.complexityLabel}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {workflowEntry?.simulationFingerprint && (
                              <p className="mt-2 text-xs text-cyan-200/70">
                                Evidence {workflowEntry.simulationFingerprint.slice(0, 12)} saved. No broker orders submitted.
                              </p>
                            )}

                            {follower.adjustments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {follower.adjustments.slice(0, 2).map((adjustment) => (
                                  <div
                                    key={`${follower.followerAccountId}-${adjustment.symbol}-${adjustment.actionLabel}`}
                                    className="rounded-lg border border-white/8 bg-black/10 px-3 py-2"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-xs font-semibold text-white">{adjustment.symbol}</span>
                                      <span className="text-xs text-red-300">{adjustment.actionLabel}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-400">{adjustment.detail}</p>
                                  </div>
                                ))}
                                {follower.adjustments.length > 2 && (
                                  <p className="text-xs text-zinc-500">
                                    +{follower.adjustments.length - 2} more planned adjustment{follower.adjustments.length - 2 === 1 ? "" : "s"}.
                                  </p>
                                )}
                              </div>
                            )}

                            {!usingMockData && (
                              <div className="mt-3 space-y-3 rounded-xl border border-white/8 bg-black/10 p-3">
                                <Textarea
                                  value={positionSyncReviewNotes[workflowKey] ?? workflowEntry?.note ?? ""}
                                  onChange={(event) => onPositionSyncReviewNoteChange(workflowKey, event.target.value)}
                                  placeholder="Add an operator note for this sync plan"
                                  className="min-h-[88px] border-white/10 bg-white/[0.03] text-sm text-zinc-100 placeholder:text-zinc-500"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="bg-white text-black hover:bg-zinc-200"
                                    onClick={() => onPositionSyncReview(group.groupId, follower.followerAccountId)}
                                  >
                                    Mark reviewed
                                  </Button>
                                  {workflowEntry?.reviewedAt && (
                                    <p className="text-xs text-zinc-500">
                                      Reviewed on {new Date(workflowEntry.reviewedAt).toLocaleString()}.
                                    </p>
                                  )}
                                  {workflowEntry?.operatorName && (
                                    <p className="text-xs text-zinc-500">
                                      Operator owner: {workflowEntry.operatorName}.
                                    </p>
                                  )}
                                  {(workflowEntry?.operatorHistory?.length ?? 0) > 1 && (
                                    <p className="text-xs text-zinc-500">
                                      Ownership changes: {(workflowEntry?.operatorHistory?.length ?? 0) - 1}.
                                    </p>
                                  )}
                                  {workflowEntry?.operatorHistory?.[workflowEntry.operatorHistory.length - 1]?.reason && (
                                    <p className="text-xs text-zinc-500">
                                      Latest ownership reason: {workflowEntry.operatorHistory[workflowEntry.operatorHistory.length - 1]?.reason}.
                                    </p>
                                  )}
                                  {(workflowEntry?.operatorHistory?.length ?? 0) > 0 && (
                                    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3">
                                      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                                        Ownership Timeline
                                      </p>
                                      <div className="mt-2 space-y-2">
                                        {workflowEntry.operatorHistory?.map((assignment, index) => (
                                          <div
                                            key={`${workflowKey}-assignment-${index}`}
                                            className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                                          >
                                            <p className="text-zinc-200">
                                              {assignment.operatorName} on {new Date(assignment.assignedAt).toLocaleString()}.
                                            </p>
                                            {assignment.reason && (
                                              <p className="mt-1 text-zinc-500">{assignment.reason}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {workflowEntry?.approvedAt && (
                                    <p className="text-xs text-zinc-500">
                                      Approved on {new Date(workflowEntry.approvedAt).toLocaleString()}.
                                    </p>
                                  )}
                                  {workflowEntry?.handedOffAt && (
                                    <p className="text-xs text-zinc-500">
                                      Handed off on {new Date(workflowEntry.handedOffAt).toLocaleString()}.
                                    </p>
                                  )}
                                  {workflowEntry?.completedManuallyAt && (
                                    <p className="text-xs text-zinc-500">
                                      Completed manually on {new Date(workflowEntry.completedManuallyAt).toLocaleString()}.
                                    </p>
                                  )}
                                  {!workflowEntry?.reviewedAt && workflowEntry?.simulatedAt && (
                                    <p className="text-xs text-zinc-500">
                                      Simulated on {new Date(workflowEntry.simulatedAt).toLocaleString()}.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {group.followers.length > 2 && (
                        <p className="text-xs text-zinc-500">
                          +{group.followers.length - 2} more follower{group.followers.length - 2 === 1 ? "" : "s"} in this review.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-zinc-400">
            Load position-sync detail when you want per-group sync status and follower review items.
          </div>
        )}
      </div>
    </Card>
  );
}
