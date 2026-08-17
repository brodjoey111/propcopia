import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CopyGroupAlertFeedItem {
  alertId: string;
  storyKey: string;
  userId: string;
  groupId: string;
  timestamp: string;
  severity: "info" | "warn" | "error";
  title: string;
  message: string;
  accountId?: string;
  source: "activity" | "health";
  healthStatus?: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  restartRecoveryMessage?: string;
  restartRecoveryAt?: string;
}

interface CopyGroupAlertReviewEntry {
  storyKey: string;
  groupId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: Array<{
    operatorName: string;
    assignedAt: string;
    reason?: string;
  }>;
  reviewedAt?: string;
}

interface ActivityCopyGroupAlertBoardProps {
  copyGroupAlertStories: CopyGroupAlertFeedItem[];
  recentCopyGroupAlerts: CopyGroupAlertFeedItem[];
  sortedCopyGroupAlertStories: CopyGroupAlertFeedItem[];
  newCopyGroupAlertCount: number;
  unownedCopyGroupAlertCount: number;
  myCopyGroupAlertCount: number;
  reviewedCopyGroupAlertCount: number;
  staleCopyGroupAlertCount: number;
  copyGroupAlertSearch: string;
  onCopyGroupAlertSearchChange: (value: string) => void;
  copyGroupAlertFilter: "all" | "unowned" | "mine" | "reviewed" | "stale";
  onCopyGroupAlertFilterChange: (
    value: "all" | "unowned" | "mine" | "reviewed" | "stale",
  ) => void;
  selectedCopyGroupAlertStoryKeys: string[];
  copyGroupAlertNotes: Record<string, string>;
  copyGroupAlertReviewsByStoryKey: Map<string, CopyGroupAlertReviewEntry>;
  formatTimestamp: (timestamp: string) => string;
  isSaving: boolean;
  onToggleCopyGroupAlertSelection: (storyKey: string) => void;
  onSelectAllVisibleCopyGroupAlerts: () => void;
  onSelectUnownedCopyGroupAlerts: () => void;
  onClearCopyGroupAlertSelection: () => void;
  onBulkTakeCopyGroupAlertOwnership: () => void;
  onBulkAcknowledgeCopyGroupAlerts: () => void;
  onCopyGroupAlertNoteChange: (storyKey: string, value: string) => void;
  onTakeCopyGroupAlertOwnership: (alert: CopyGroupAlertFeedItem) => void;
  onAcknowledgeCopyGroupAlert: (alert: CopyGroupAlertFeedItem) => void;
  onReopenCopyGroupAlert: (alert: CopyGroupAlertFeedItem) => void;
  getCopyGroupAlertFreshnessLabel: (
    alert: CopyGroupAlertFeedItem,
    review: CopyGroupAlertReviewEntry | undefined,
  ) => {
    label: string;
    toneClass: string;
  };
}

export function ActivityCopyGroupAlertBoard(
  props: ActivityCopyGroupAlertBoardProps,
) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,14,20,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Copy Group Alert History</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Shared alert stream</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Shared alert stream feeding notifications and operator recovery.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
          {props.sortedCopyGroupAlertStories.length} queue items, {props.recentCopyGroupAlerts.length} recent alerts
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">New Since Review</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.newCopyGroupAlertCount}</p>
          <p className="mt-1 text-sm text-cyan-100/80">fresh shared stories that have never been acknowledged</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Unowned</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.unownedCopyGroupAlertCount}</p>
          <p className="mt-1 text-sm text-zinc-400">shared alert stories waiting for an operator</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100">Owned By Me</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.myCopyGroupAlertCount}</p>
          <p className="mt-1 text-sm text-cyan-100/80">active copy-group stories already claimed by you</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">Reviewed</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.reviewedCopyGroupAlertCount}</p>
          <p className="mt-1 text-sm text-emerald-100/80">stories already acknowledged in the shared queue</p>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100">Stale</p>
          <p className="mt-2 text-2xl font-semibold text-white">{props.staleCopyGroupAlertCount}</p>
          <p className="mt-1 text-sm text-amber-100/80">reviewed stories with newer alert activity behind them</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Input
          value={props.copyGroupAlertSearch}
          onChange={(event) => props.onCopyGroupAlertSearchChange(event.target.value)}
          placeholder="Search alert stories, groups, owners, or notes"
          className="min-w-[280px] border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
        />
        {props.sortedCopyGroupAlertStories.length > 0 && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
              onClick={props.onSelectAllVisibleCopyGroupAlerts}
            >
              Select visible
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
              onClick={props.onSelectUnownedCopyGroupAlerts}
            >
              Select unowned
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
              onClick={props.onClearCopyGroupAlertSelection}
              disabled={props.selectedCopyGroupAlertStoryKeys.length === 0}
            >
              Clear selection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
              onClick={props.onBulkTakeCopyGroupAlertOwnership}
              disabled={props.selectedCopyGroupAlertStoryKeys.length === 0 || props.isSaving}
            >
              Take ownership of selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
              onClick={props.onBulkAcknowledgeCopyGroupAlerts}
              disabled={props.selectedCopyGroupAlertStoryKeys.length === 0 || props.isSaving}
            >
              Acknowledge selected
            </Button>
          </>
        )}
        {(["all", "unowned", "mine", "reviewed", "stale"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm ${
              props.copyGroupAlertFilter === filter
                ? "border-rose-400/30 bg-rose-400/15 text-rose-100"
                : "border-white/10 bg-white/[0.03] text-zinc-200"
            }`}
            onClick={() => props.onCopyGroupAlertFilterChange(filter)}
          >
            {filter === "all"
              ? `All (${props.copyGroupAlertStories.length})`
              : filter === "unowned"
                ? `Unowned (${props.unownedCopyGroupAlertCount})`
                : filter === "mine"
                  ? `Owned By Me (${props.myCopyGroupAlertCount})`
                  : filter === "reviewed"
                    ? `Reviewed (${props.reviewedCopyGroupAlertCount})`
                    : `Stale (${props.staleCopyGroupAlertCount})`}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {props.sortedCopyGroupAlertStories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 xl:col-span-3">
            No shared copy-group alerts match the current queue filter right now.
          </div>
        ) : (
          props.sortedCopyGroupAlertStories.slice(0, 6).map((alert) => {
            const review = props.copyGroupAlertReviewsByStoryKey.get(alert.storyKey);
            const freshness = props.getCopyGroupAlertFreshnessLabel(alert, review);

            return (
              <div
                key={alert.alertId}
                className={`rounded-2xl border p-4 ${
                  alert.severity === "error"
                    ? "border-rose-400/20 bg-rose-400/10"
                    : alert.severity === "warn"
                      ? "border-amber-400/20 bg-amber-400/10"
                      : "border-emerald-400/20 bg-emerald-400/10"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={props.selectedCopyGroupAlertStoryKeys.includes(alert.storyKey)}
                      onChange={() => props.onToggleCopyGroupAlertSelection(alert.storyKey)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    Select
                  </label>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{alert.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {alert.groupId} • {props.formatTimestamp(alert.timestamp)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${
                      alert.severity === "error"
                        ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                        : alert.severity === "warn"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    {alert.healthStatus ?? alert.source}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${freshness.toneClass}`}>
                    {freshness.label}
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-200">{alert.message}</p>
                {alert.restartRecoveryMessage && (
                  <p className="mt-2 text-xs text-cyan-200">
                    Restart recovery: {alert.restartRecoveryMessage}
                    {alert.restartRecoveryAt
                      ? ` (${props.formatTimestamp(alert.restartRecoveryAt)})`
                      : ""}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>Story key: {alert.storyKey}</span>
                  <span>Owner: {review?.operatorName ?? "Unassigned"}</span>
                  <span>Status: {review?.status ?? "pending"}</span>
                  {review?.reviewedAt && (
                    <span>Reviewed: {props.formatTimestamp(review.reviewedAt)}</span>
                  )}
                </div>
                <Input
                  value={props.copyGroupAlertNotes[alert.storyKey] ?? review?.note ?? ""}
                  onChange={(event) =>
                    props.onCopyGroupAlertNoteChange(alert.storyKey, event.target.value)
                  }
                  placeholder="Shared alert note"
                  className="mt-3 border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-500"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                    onClick={() => props.onTakeCopyGroupAlertOwnership(alert)}
                    disabled={props.isSaving}
                  >
                    Take ownership
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    onClick={() => props.onAcknowledgeCopyGroupAlert(alert)}
                    disabled={props.isSaving}
                  >
                    {review?.status === "reviewed" ? "Update acknowledgment" : "Acknowledge"}
                  </Button>
                  {review && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                      onClick={() => props.onReopenCopyGroupAlert(alert)}
                      disabled={props.isSaving}
                    >
                      Reopen
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
