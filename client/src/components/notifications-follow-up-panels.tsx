import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecutionFollowUpSignalSummary } from "@/components/execution-follow-up-signal-summary";
import { Input } from "@/components/ui/input";
import type { RiskNotificationFollowUpItem } from "@/lib/notifications";
import type { PositionSyncRepairCandidateEntry, PositionSyncRepairBoardSummary } from "@/lib/position-sync-queue";
import type { ExecutionRecoveryFollowUpItem } from "@/lib/runtime-overview";

interface NotificationsFollowUpPanelsProps {
  userName?: string;
  syncRepairFollowUpItems: PositionSyncRepairCandidateEntry[];
  positionSyncRepairSummary: Pick<PositionSyncRepairBoardSummary, "needsAttention" | "unowned">;
  riskFollowUpItems: RiskNotificationFollowUpItem[];
  reviewedRiskFollowUpItems: Record<string, string>;
  reviewedRiskFollowUpCount: number;
  riskFollowUpNotes: Record<string, string>;
  riskReviewsByAccountId: Map<
    string,
    {
      note?: string;
      operatorName?: string;
      operatorHistory?: Array<{
        operatorName: string;
        assignedAt: string;
        reason?: string;
      }>;
    }
  >;
  executionFollowUpItems: ExecutionRecoveryFollowUpItem[];
  reviewedExecutionFollowUpCount: number;
  executionFollowUpNotes: Record<string, string>;
  formatTimestamp: (timestamp: string) => string;
  onRiskNoteChange: (id: string, value: string) => void;
  onTakeRiskOwnership: (id: string) => void;
  onSaveRiskNote: (id: string) => void;
  onToggleRiskReviewed: (id: string, reviewed: boolean) => void;
  onTakeExecutionOwnership: (historyId: string) => void;
  onSaveExecutionNote: (historyId: string) => void;
  onRecheckExecution: (historyId: string) => void;
  onToggleExecutionReviewed: (historyId: string, reviewed: boolean) => void;
  onExecutionNoteChange: (historyId: string, value: string) => void;
  onTakeSyncRepairOwnership: (key: string) => void;
  onAdvanceSyncRepairCandidate: (key: string) => void;
}

export function NotificationsFollowUpPanels({
  userName,
  syncRepairFollowUpItems,
  positionSyncRepairSummary,
  riskFollowUpItems,
  reviewedRiskFollowUpItems,
  reviewedRiskFollowUpCount,
  riskFollowUpNotes,
  riskReviewsByAccountId,
  executionFollowUpItems,
  reviewedExecutionFollowUpCount,
  executionFollowUpNotes,
  formatTimestamp,
  onRiskNoteChange,
  onTakeRiskOwnership,
  onSaveRiskNote,
  onToggleRiskReviewed,
  onTakeExecutionOwnership,
  onSaveExecutionNote,
  onRecheckExecution,
  onToggleExecutionReviewed,
  onExecutionNoteChange,
  onTakeSyncRepairOwnership,
  onAdvanceSyncRepairCandidate,
}: NotificationsFollowUpPanelsProps) {
  return (
    <>
      {syncRepairFollowUpItems.length > 0 && (
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Sync Repair Follow-Up</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Staged sync watchlist</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Aging or unowned staged sync candidates that should be moved before they become queue debt.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
              {positionSyncRepairSummary.needsAttention} aging • {positionSyncRepairSummary.unowned} unowned
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {syncRepairFollowUpItems.map((item) => (
              <div
                key={item.key}
                className={`rounded-2xl border p-4 ${
                  item.needsAttention
                    ? "border-amber-400/20 bg-amber-400/10"
                    : "border-cyan-400/20 bg-cyan-400/10"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-300">{item.followerName}</p>
                    <p className="mt-2 text-sm text-white/80">{item.recommendationReason}</p>
                    <p className="mt-2 text-xs text-zinc-300">
                      {item.workflowTimestamp
                        ? `${item.workflowTimestampLabel} on ${formatTimestamp(item.workflowTimestamp)}`
                        : item.workflowTimestampLabel}
                      {item.workflowTimestamp && item.workflowStatus !== "not_started" ? ` • ${item.ageMinutes} minutes in stage` : ""}
                    </p>
                    {item.needsAttention && item.attentionLabel && (
                      <p className="mt-2 text-xs text-amber-100">{item.attentionLabel}</p>
                    )}
                    {!item.operatorName && item.workflowStatus !== "not_started" && item.workflowStatus !== "completed_manually" && (
                      <p className="mt-2 text-xs text-cyan-100">Owner needed before the next manual sync step.</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-200">
                        {item.recommendationLabel}
                      </span>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                        {item.workflowLabel}
                      </span>
                    </div>
                    {item.operatorName && (
                      <p className="text-xs text-cyan-200">Owner: {item.operatorName}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 md:justify-end">
                      {item.workflowStatus !== "completed_manually" && !item.operatorName && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                          onClick={() => onTakeSyncRepairOwnership(item.key)}
                        >
                          Take ownership
                        </Button>
                      )}
                      {(item.workflowStatus === "not_started" ||
                        item.workflowStatus === "reviewed" ||
                        item.workflowStatus === "simulated") && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                          onClick={() => onAdvanceSyncRepairCandidate(item.key)}
                        >
                          {item.workflowStatus === "not_started"
                            ? "Start review"
                            : item.workflowStatus === "reviewed"
                              ? "Simulate"
                              : "Approve"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {riskFollowUpItems.length > 0 && (
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Risk Follow-Up</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Manual risk review queue</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Prioritized risk items that should be reviewed before the next copy session starts.
              </p>
            </div>
            {reviewedRiskFollowUpCount > 0 && (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                {reviewedRiskFollowUpCount} reviewed
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {riskFollowUpItems.map((item) => {
              const review = riskReviewsByAccountId.get(item.id);
              const noteValue = riskFollowUpNotes[item.id] ?? review?.note ?? "";
              const reassignmentCount = review?.operatorHistory?.length ?? 0;
              const isReviewed = !!reviewedRiskFollowUpItems[item.id];

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    item.severity === "error"
                      ? "border-rose-400/20 bg-rose-400/10"
                      : item.severity === "warn"
                        ? "border-amber-400/20 bg-amber-400/10"
                        : "border-cyan-400/20 bg-cyan-400/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm text-white/80">{item.detail}</p>
                      <p className="mt-2 text-xs text-zinc-300">{item.actionLabel}</p>
                      {review?.operatorName && (
                        <p className="mt-2 text-xs text-cyan-200">Owner: {review.operatorName}</p>
                      )}
                      {reassignmentCount > 0 && (
                        <p className="mt-1 text-xs text-zinc-400">Ownership changes: {reassignmentCount}</p>
                      )}
                      {isReviewed && (
                        <p className="mt-2 text-xs text-emerald-200">
                          Reviewed at {formatTimestamp(reviewedRiskFollowUpItems[item.id])}
                        </p>
                      )}
                      <Input
                        value={noteValue}
                        onChange={(event) => onRiskNoteChange(item.id, event.target.value)}
                        placeholder="Shared operator note"
                        className="mt-3 border-white/10 bg-black/10 text-white placeholder:text-zinc-500"
                      />
                      {review?.note && !riskFollowUpNotes[item.id] && (
                        <p className="mt-2 text-xs text-zinc-400">Saved note: {review.note}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                        {formatTimestamp(item.timestamp)}
                      </p>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {userName && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-white/10 bg-white/[0.03] text-zinc-300"
                              onClick={() => onTakeRiskOwnership(item.id)}
                            >
                              {review?.operatorName === userName ? "Refresh owner" : "Take ownership"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                              onClick={() => onSaveRiskNote(item.id)}
                            >
                              Save note
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isReviewed ? "outline" : "default"}
                        className={
                          isReviewed
                            ? "border-white/10 bg-white/[0.03] text-zinc-300"
                            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                        }
                        onClick={() => onToggleRiskReviewed(item.id, isReviewed)}
                      >
                        {isReviewed ? "Reopen" : "Mark reviewed"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {executionFollowUpItems.length > 0 && (
        <Card className="border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Execution Follow-Up</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Manual execution recovery queue</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Review failed orders and recheck stale or partial lifecycle items from the inbox surface.
              </p>
            </div>
            {reviewedExecutionFollowUpCount > 0 && (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                {reviewedExecutionFollowUpCount} reviewed
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {executionFollowUpItems.map((item) => (
              <div
                key={item.historyId}
                className={`rounded-2xl border p-4 ${
                  item.severity === "error"
                    ? "border-rose-400/20 bg-rose-400/10"
                    : item.severity === "warn"
                      ? "border-amber-400/20 bg-amber-400/10"
                      : "border-cyan-400/20 bg-cyan-400/10"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.symbol}</p>
                    <p className="mt-2 text-sm text-white/80">{item.headline}</p>
                    <p className="mt-2 text-sm text-zinc-300">{item.detail}</p>
                    <ExecutionFollowUpSignalSummary
                      checkpoint={item.checkpoint}
                      recoveryWindow={item.recoveryWindow}
                    />
                    <p className="mt-2 text-xs text-zinc-300">{item.actionLabel}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      Follower: {item.followerAccountId} • {item.ageMinutes} minutes old
                    </p>
                    {item.operatorName && (
                      <p className="mt-2 text-xs text-cyan-200">Owner: {item.operatorName}</p>
                    )}
                    {(item.operatorHistory?.length ?? 0) > 0 && (
                      <p className="mt-1 text-xs text-zinc-400">Ownership changes: {item.operatorHistory?.length}</p>
                    )}
                    {item.reviewedAt && (
                      <p className="mt-2 text-xs text-emerald-200">
                        Reviewed at {formatTimestamp(item.reviewedAt)}
                      </p>
                    )}
                    <Input
                      value={executionFollowUpNotes[item.historyId] ?? item.reviewNote ?? ""}
                      onChange={(event) => onExecutionNoteChange(item.historyId, event.target.value)}
                      placeholder="Execution review note"
                      className="mt-3 border-white/10 bg-black/10 text-white placeholder:text-zinc-500"
                      disabled={item.category !== "failed"}
                    />
                    {item.reviewNote && !executionFollowUpNotes[item.historyId] && (
                      <p className="mt-2 text-xs text-zinc-400">Saved note: {item.reviewNote}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                      {item.category === "failed"
                        ? "Failure"
                        : item.category === "stale"
                          ? "Stale"
                          : item.category === "partial"
                            ? "Partial"
                            : "Active"}
                    </p>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-white/10 bg-white/[0.03] text-zinc-300"
                        onClick={() => onTakeExecutionOwnership(item.historyId)}
                      >
                        {item.operatorName === userName ? "Refresh owner" : "Take ownership"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                        onClick={() => onSaveExecutionNote(item.historyId)}
                      >
                        Save note
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                        onClick={() => onRecheckExecution(item.historyId)}
                      >
                        Recheck
                      </Button>
                      {item.category === "failed" && (
                        <Button
                          type="button"
                          size="sm"
                          variant={item.reviewStatus === "reviewed" ? "outline" : "default"}
                          className={
                            item.reviewStatus === "reviewed"
                              ? "border-white/10 bg-white/[0.03] text-zinc-300"
                              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                          }
                          onClick={() => onToggleExecutionReviewed(item.historyId, item.reviewStatus === "reviewed")}
                        >
                          {item.reviewStatus === "reviewed" ? "Reopen" : "Mark reviewed"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
