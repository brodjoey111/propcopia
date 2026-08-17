import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CopyGroupHealthTone = "ok" | "warn" | "danger" | "muted";
type CopyGroupHealthBoardView = "compact" | "detailed";
type CopyGroupHealthReviewFilter =
  | "all"
  | "unreviewed"
  | "reviewed"
  | "stale"
  | "recurring";
type CopyGroupHealthRecoveryFilter =
  | "all"
  | "recover_now"
  | "stabilize_soon"
  | "resume_check"
  | "stage_before_use";

interface CopyGroupHealthWatchlistEntry {
  groupId: string;
  groupName: string;
  status: string;
  healthStatus: string;
  tone: CopyGroupHealthTone;
  concernLabel: string;
  detail: string;
  followerReadinessLabel: string;
  signalFreshnessLabel: string;
  signalFreshnessDetail: string;
  signalFreshnessTone: CopyGroupHealthTone;
  routingGateLabel: string;
  routingGateDetail: string;
  routingGateTone: CopyGroupHealthTone;
  recoveryQueueLabel: string;
  recoveryQueueDetail: string;
  latestRecoveryActionLabel?: string;
  latestRestartRecoveryLabel?: string;
  lastStableSignalLabel?: string;
  timeInConcernStateLabel?: string;
}

interface CopyGroupHealthReviewEntry {
  concernSignature?: string;
  acknowledgedAt: string;
  reviewedBy?: string;
  note: string;
  history?: Array<{
    acknowledgedAt: string;
    reviewedBy?: string;
    note: string;
    concernSignature?: string;
  }>;
}

interface CopyGroupHealthWatchlistSummary {
  entries: CopyGroupHealthWatchlistEntry[];
  counts: {
    attention: number;
    degraded: number;
    paused: number;
    disconnectedFollowers: number;
  };
}

interface CopyGroupHealthBulkResultSummary {
  action: "acknowledged" | "cleared";
  count: number;
  groupNames: string[];
  recordedAt: string;
}

function getCopyGroupHealthSignalBadgeClass(tone: CopyGroupHealthTone) {
  if (tone === "danger") {
    return "border-rose-400/30 bg-rose-400/15 text-rose-100";
  }

  if (tone === "warn") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (tone === "ok") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.03] text-zinc-300";
}

interface ActivityCopyGroupHealthBoardProps {
  copyGroupPulse: {
    headline: string;
    detail: string;
    tone: CopyGroupHealthTone;
  };
  copyGroupHealthWatchlist: CopyGroupHealthWatchlistSummary;
  reviewedCopyGroupHealthCount: number;
  staleCopyGroupHealthReviewCount: number;
  recurringCopyGroupHealthCount: number;
  unreviewedCopyGroupHealthCount: number;
  recoverNowCopyGroupHealthCount: number;
  stabilizeSoonCopyGroupHealthCount: number;
  resumeCheckCopyGroupHealthCount: number;
  stageBeforeUseCopyGroupHealthCount: number;
  copyGroupHealthSearch: string;
  onCopyGroupHealthSearchChange: (value: string) => void;
  copyGroupHealthBoardView: CopyGroupHealthBoardView;
  onCopyGroupHealthBoardViewChange: (value: CopyGroupHealthBoardView) => void;
  copyGroupHealthReviewFilter: CopyGroupHealthReviewFilter;
  onCopyGroupHealthReviewFilterChange: (
    value: CopyGroupHealthReviewFilter,
  ) => void;
  copyGroupHealthRecoveryFilter: CopyGroupHealthRecoveryFilter;
  onCopyGroupHealthRecoveryFilterChange: (
    value: CopyGroupHealthRecoveryFilter,
  ) => void;
  sortedCopyGroupHealthEntries: CopyGroupHealthWatchlistEntry[];
  recoverNowCopyGroupHealthEntries: CopyGroupHealthWatchlistEntry[];
  selectedCopyGroupHealthGroupIds: string[];
  copyGroupHealthReviews: Record<string, CopyGroupHealthReviewEntry>;
  copyGroupHealthNotes: Record<string, string>;
  copyGroupHealthBulkResultSummary: CopyGroupHealthBulkResultSummary | null;
  formatTimestamp: (timestamp: string) => string;
  buildCopyGroupHealthConcernSignature: (
    entry: CopyGroupHealthWatchlistEntry,
  ) => string;
  countRecentMatchingHealthReviews: (
    review: CopyGroupHealthReviewEntry | undefined,
    concernSignature: string,
  ) => number;
  onToggleCopyGroupHealthSelection: (groupId: string) => void;
  onSelectAllVisibleCopyGroupHealthEntries: () => void;
  onSelectAttentionCopyGroupHealthEntries: () => void;
  onSelectRecoverNowCopyGroupHealthEntries: () => void;
  onSelectStaleCopyGroupHealthEntries: () => void;
  onClearCopyGroupHealthSelection: () => void;
  onBulkClearCopyGroupHealthReviews: () => void;
  onBulkAcknowledgeCopyGroupHealthReviews: () => void;
  onCopyGroupHealthNoteChange: (groupId: string, value: string) => void;
  onAcknowledgeCopyGroupHealth: (groupId: string) => void;
  onClearCopyGroupHealthReview: (groupId: string) => void;
}

export function ActivityCopyGroupHealthBoard(
  props: ActivityCopyGroupHealthBoardProps,
) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Copy Group Health</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Operational watchlist</h2>
          <p className="mt-1 text-sm text-zinc-400">{props.copyGroupPulse.detail}</p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            props.copyGroupPulse.tone === "danger"
              ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
              : props.copyGroupPulse.tone === "warn"
                ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                : props.copyGroupPulse.tone === "muted"
                  ? "border-white/10 bg-white/[0.03] text-zinc-300"
                  : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
          }`}
        >
          {props.copyGroupPulse.headline}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-rose-200">Needs Attention</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.copyGroupHealthWatchlist.counts.attention}</p>
          <p className="mt-1 text-sm text-rose-100/80">Unhealthy or emergency-stopped groups</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200">On Watch</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.copyGroupHealthWatchlist.counts.degraded}</p>
          <p className="mt-1 text-sm text-amber-100/80">Degraded groups or follower readiness drift</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Paused</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.copyGroupHealthWatchlist.counts.paused}</p>
          <p className="mt-1 text-sm text-zinc-400">Groups not actively routing right now</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">Reviewed</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.reviewedCopyGroupHealthCount}</p>
          <p className="mt-1 text-sm text-emerald-100/80">Groups already acknowledged by the operator</p>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100">Stale Reviews</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.staleCopyGroupHealthReviewCount}</p>
          <p className="mt-1 text-sm text-amber-100/80">Acknowledgements that no longer match the current issue</p>
        </div>
        <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-violet-100">Recurring Groups</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.recurringCopyGroupHealthCount}</p>
          <p className="mt-1 text-sm text-violet-100/80">Groups reviewed multiple times for the same issue in the last 24 hours</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">Followers Offline</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.copyGroupHealthWatchlist.counts.disconnectedFollowers}</p>
          <p className="mt-1 text-sm text-cyan-100/80">Follower connections not ready across all groups</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Input
          value={props.copyGroupHealthSearch}
          onChange={(event) => props.onCopyGroupHealthSearchChange(event.target.value)}
          placeholder="Search groups, issues, notes, or reviewers"
          className="min-w-[280px] border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
        />
        {(["compact", "detailed"] as const).map((view) => (
          <button
            key={view}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm ${
              props.copyGroupHealthBoardView === view
                ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-zinc-200"
            }`}
            onClick={() => props.onCopyGroupHealthBoardViewChange(view)}
          >
            {view === "compact" ? "Compact view" : "Detailed view"}
          </button>
        ))}
        {props.sortedCopyGroupHealthEntries.length > 0 && (
          <>
            <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onSelectAllVisibleCopyGroupHealthEntries}>
              Select visible
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15" onClick={props.onSelectAttentionCopyGroupHealthEntries}>
              Select attention only
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15" onClick={props.onSelectStaleCopyGroupHealthEntries}>
              Select stale only
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]" onClick={props.onClearCopyGroupHealthSelection} disabled={props.selectedCopyGroupHealthGroupIds.length === 0}>
              Clear selection
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15" onClick={props.onBulkAcknowledgeCopyGroupHealthReviews} disabled={props.selectedCopyGroupHealthGroupIds.length === 0}>
              Re-acknowledge selected
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15" onClick={props.onBulkClearCopyGroupHealthReviews} disabled={props.selectedCopyGroupHealthGroupIds.length === 0}>
              Clear selected reviews
            </Button>
          </>
        )}
        {(["all", "unreviewed", "reviewed", "stale", "recurring"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm ${
              props.copyGroupHealthReviewFilter === filter
                ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-zinc-200"
            }`}
            onClick={() => props.onCopyGroupHealthReviewFilterChange(filter)}
          >
            {filter === "all"
              ? `All (${props.copyGroupHealthWatchlist.entries.length})`
              : filter === "unreviewed"
                ? `Unreviewed (${props.unreviewedCopyGroupHealthCount})`
                : filter === "reviewed"
                  ? `Reviewed (${props.reviewedCopyGroupHealthCount - props.staleCopyGroupHealthReviewCount})`
                  : filter === "stale"
                    ? `Stale Reviews (${props.staleCopyGroupHealthReviewCount})`
                    : `Recurring (${props.recurringCopyGroupHealthCount})`}
          </button>
        ))}
        {(["all", "recover_now", "stabilize_soon", "resume_check", "stage_before_use"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm ${
              props.copyGroupHealthRecoveryFilter === filter
                ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                : "border-white/10 bg-white/[0.03] text-zinc-200"
            }`}
            onClick={() => props.onCopyGroupHealthRecoveryFilterChange(filter)}
          >
            {filter === "all"
              ? "All recovery lanes"
              : filter === "recover_now"
                ? `Recover Now (${props.recoverNowCopyGroupHealthCount})`
                : filter === "stabilize_soon"
                  ? `Stabilize Soon (${props.stabilizeSoonCopyGroupHealthCount})`
                  : filter === "resume_check"
                    ? `Resume Check (${props.resumeCheckCopyGroupHealthCount})`
                    : `Stage Before Use (${props.stageBeforeUseCopyGroupHealthCount})`}
          </button>
        ))}
      </div>

      {props.copyGroupHealthBulkResultSummary && props.copyGroupHealthBulkResultSummary.count > 0 && (
        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {props.copyGroupHealthBulkResultSummary.action === "acknowledged"
            ? `Bulk recovery pass acknowledged ${props.copyGroupHealthBulkResultSummary.count} group${props.copyGroupHealthBulkResultSummary.count === 1 ? "" : "s"}`
            : `Bulk recovery pass cleared ${props.copyGroupHealthBulkResultSummary.count} review${props.copyGroupHealthBulkResultSummary.count === 1 ? "" : "s"}`}
          {props.copyGroupHealthBulkResultSummary.groupNames.length > 0
            ? `: ${props.copyGroupHealthBulkResultSummary.groupNames.join(", ")}`
            : ""}
          {props.copyGroupHealthBulkResultSummary.count > props.copyGroupHealthBulkResultSummary.groupNames.length
            ? ` and ${props.copyGroupHealthBulkResultSummary.count - props.copyGroupHealthBulkResultSummary.groupNames.length} more`
            : ""}
          .
          <span className="ml-2 text-xs text-cyan-100/80">
            Logged at {props.formatTimestamp(props.copyGroupHealthBulkResultSummary.recordedAt)}
          </span>
        </div>
      )}

      {props.recoverNowCopyGroupHealthEntries.length > 0 && (
        <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-rose-100">Recover Now Queue</p>
              <p className="mt-2 text-sm text-rose-100/85">
                Highest-priority copy groups that need operator recovery work before the next routing window.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" className="border-rose-300/30 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15" onClick={() => props.onCopyGroupHealthRecoveryFilterChange("recover_now")}>
              Focus Recover Now
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="border-rose-300/30 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15" onClick={props.onSelectRecoverNowCopyGroupHealthEntries}>
              Select Recover Now
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15" onClick={props.onBulkAcknowledgeCopyGroupHealthReviews} disabled={props.selectedCopyGroupHealthGroupIds.length === 0}>
              Acknowledge selected urgent groups
            </Button>
            <Button type="button" size="sm" variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15" onClick={props.onBulkClearCopyGroupHealthReviews} disabled={props.selectedCopyGroupHealthGroupIds.length === 0}>
              Clear selected urgent reviews
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {props.recoverNowCopyGroupHealthEntries.slice(0, 3).map((entry) => (
              <div key={`${entry.groupId}-recover-now`} className="rounded-2xl border border-rose-300/20 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.followerReadinessLabel}</p>
                  </div>
                  <span className="rounded-full border border-rose-300/30 bg-rose-300/10 px-3 py-1 text-xs text-rose-100">
                    {entry.concernLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-200">{entry.detail}</p>
                <p className="mt-2 text-xs text-rose-100/90">
                  Next recovery step: {entry.recoveryQueueDetail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-zinc-500">Routing gate</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 ${getCopyGroupHealthSignalBadgeClass(entry.routingGateTone)}`}
                  >
                    {entry.routingGateLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {entry.routingGateDetail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-zinc-500">Signal freshness</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 ${getCopyGroupHealthSignalBadgeClass(entry.signalFreshnessTone)}`}
                  >
                    {entry.signalFreshnessLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {entry.signalFreshnessDetail}
                </p>
                {entry.latestRestartRecoveryLabel && (
                  <p className="mt-2 text-xs text-cyan-100/90">
                    Restart recovery: {entry.latestRestartRecoveryLabel}
                  </p>
                )}
                {entry.timeInConcernStateLabel && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Time in current warning state: {entry.timeInConcernStateLabel}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {props.sortedCopyGroupHealthEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-3">
            No copy groups match the current review filter right now.
          </div>
        ) : (
          props.sortedCopyGroupHealthEntries.slice(0, 6).map((entry) => {
            const review = props.copyGroupHealthReviews[entry.groupId];
            const concernSignature = props.buildCopyGroupHealthConcernSignature(entry);
            const reviewIsStale = !!review && review.concernSignature !== concernSignature;
            const repeatedReviewCount = props.countRecentMatchingHealthReviews(
              review,
              concernSignature,
            );

            return (
              <div key={entry.groupId} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={props.selectedCopyGroupHealthGroupIds.includes(entry.groupId)}
                      onChange={() => props.onToggleCopyGroupHealthSelection(entry.groupId)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    Select
                  </label>
                </div>
                {review ? (
                  <div
                    className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
                      reviewIsStale
                        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    }`}
                  >
                    {reviewIsStale ? "Review needs refresh." : "Reviewed on "}
                    {!reviewIsStale ? props.formatTimestamp(review.acknowledgedAt) : " The current issue changed after acknowledgement."}
                    {review.note ? ` - ${review.note}` : ""}
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.groupName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{entry.followerReadinessLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {repeatedReviewCount >= 2 && (
                      <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1 text-xs text-violet-100">
                        Reviewed {repeatedReviewCount} times in 24h
                      </span>
                    )}
                    {props.copyGroupHealthReviews[entry.groupId] &&
                      props.copyGroupHealthReviews[entry.groupId].concernSignature !== concernSignature && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                          Review stale
                        </span>
                      )}
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        entry.tone === "danger"
                          ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                          : entry.tone === "warn"
                            ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                            : "border-white/10 bg-white/[0.03] text-zinc-300"
                      }`}
                    >
                      {entry.concernLabel}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        entry.tone === "danger"
                          ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                          : entry.tone === "warn"
                            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                            : "border-white/10 bg-white/[0.03] text-zinc-300"
                      }`}
                    >
                      {entry.recoveryQueueLabel}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getCopyGroupHealthSignalBadgeClass(entry.signalFreshnessTone)}`}
                    >
                      {entry.signalFreshnessLabel}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getCopyGroupHealthSignalBadgeClass(entry.routingGateTone)}`}
                    >
                      {entry.routingGateLabel}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-300">{entry.detail}</p>
                <p className="mt-2 text-xs text-cyan-100/90">
                  Next recovery step: {entry.recoveryQueueDetail}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {entry.routingGateLabel}: {entry.routingGateDetail}
                </p>
                {props.copyGroupHealthBoardView === "detailed" ? (
                  <>
                    {entry.latestRecoveryActionLabel && (
                      <p className="mt-3 text-xs text-cyan-200">
                        Latest recovery action: {entry.latestRecoveryActionLabel}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-400">
                      Signal freshness: {entry.signalFreshnessDetail}
                    </p>
                    {entry.latestRestartRecoveryLabel && (
                      <p className="mt-2 text-xs text-cyan-100/90">
                        Latest restart recovery: {entry.latestRestartRecoveryLabel}
                      </p>
                    )}
                    {entry.lastStableSignalLabel && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {entry.lastStableSignalLabel}
                      </p>
                    )}
                    {entry.timeInConcernStateLabel && (
                      <p className="mt-2 text-xs text-amber-100/90">
                        Time in current warning state: {entry.timeInConcernStateLabel}
                      </p>
                    )}
                    {props.copyGroupHealthReviews[entry.groupId] && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>
                          Last touched by: {props.copyGroupHealthReviews[entry.groupId].reviewedBy ?? "Operator"}
                        </span>
                        <span>
                          Last reviewed at: {props.formatTimestamp(props.copyGroupHealthReviews[entry.groupId].acknowledgedAt)}
                        </span>
                      </div>
                    )}
                    {(props.copyGroupHealthReviews[entry.groupId]?.history?.length ?? 0) > 0 && (
                      <div className="mt-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                          Review Timeline
                        </p>
                        <div className="mt-2 space-y-2">
                          {props.copyGroupHealthReviews[entry.groupId].history?.slice(0, 3).map((reviewStamp, index) => (
                            <div
                              key={`${entry.groupId}-review-history-${index}`}
                              className="border-l border-white/10 pl-3 text-xs text-zinc-400"
                            >
                              <p className="text-zinc-200">
                                {reviewStamp.reviewedBy ?? "Operator"} on {props.formatTimestamp(reviewStamp.acknowledgedAt)}
                              </p>
                              {reviewStamp.note && (
                                <p className="mt-1 text-zinc-500">{reviewStamp.note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    Compact view keeps the watchlist focused. Switch to detailed view for recovery context and review history.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>Runtime: {entry.status.replaceAll("_", " ")}</span>
                  <span>Health: {entry.healthStatus}</span>
                </div>
                <Input
                  value={props.copyGroupHealthNotes[entry.groupId] ?? props.copyGroupHealthReviews[entry.groupId]?.note ?? ""}
                  onChange={(event) =>
                    props.onCopyGroupHealthNoteChange(entry.groupId, event.target.value)
                  }
                  placeholder="Operator note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    onClick={() => props.onAcknowledgeCopyGroupHealth(entry.groupId)}
                  >
                    {props.copyGroupHealthReviews[entry.groupId] ? "Update review" : "Acknowledge"}
                  </Button>
                  {props.copyGroupHealthReviews[entry.groupId] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                      onClick={() => props.onClearCopyGroupHealthReview(entry.groupId)}
                    >
                      Clear review
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
