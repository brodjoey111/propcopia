import type { PositionSyncQueueEntry } from "@/lib/position-sync-queue";

type QueueAuditFocus = "all" | "overdue" | "unassigned" | "reassigned";

interface ActivityOperatorAuditBoardProps {
  queueAuditFocus: QueueAuditFocus;
  overdueSyncEntries: PositionSyncQueueEntry[];
  unassignedSyncEntries: PositionSyncQueueEntry[];
  reassignedSyncEntries: PositionSyncQueueEntry[];
  onSelectAuditFocus: (value: QueueAuditFocus) => void;
}

export function ActivityOperatorAuditBoard(props: ActivityOperatorAuditBoardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,15,22,0.98),rgba(8,10,16,0.98))] p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Operator Audit</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Manual sync ownership watchlist</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Review overdue follow-up, unassigned work, and items that have already changed hands.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <button
          type="button"
          className={`rounded-2xl border p-4 text-left ${
            props.queueAuditFocus === "overdue"
              ? "border-amber-300/40 bg-amber-300/15"
              : "border-amber-400/20 bg-amber-400/10"
          }`}
          onClick={() => props.onSelectAuditFocus(props.queueAuditFocus === "overdue" ? "all" : "overdue")}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Overdue</p>
            <span className="rounded-full border border-amber-400/30 px-2.5 py-1 text-xs text-amber-100">
              {props.overdueSyncEntries.length}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {props.overdueSyncEntries.length === 0 ? (
              <p className="text-sm text-amber-100/80">No overdue manual sync items right now.</p>
            ) : (
              props.overdueSyncEntries.slice(0, 3).map((entry) => (
                <div key={`${entry.key}-overdue`} className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-sm font-medium text-white">{entry.groupName}</p>
                  <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                  <p className="mt-2 text-xs text-amber-100">{entry.attentionLabel}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.ageMinutes} minutes in current stage</p>
                </div>
              ))
            )}
          </div>
        </button>

        <button
          type="button"
          className={`rounded-2xl border p-4 text-left ${
            props.queueAuditFocus === "unassigned"
              ? "border-cyan-300/40 bg-cyan-300/15"
              : "border-cyan-400/20 bg-cyan-400/10"
          }`}
          onClick={() => props.onSelectAuditFocus(props.queueAuditFocus === "unassigned" ? "all" : "unassigned")}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Unassigned</p>
            <span className="rounded-full border border-cyan-400/30 px-2.5 py-1 text-xs text-cyan-100">
              {props.unassignedSyncEntries.length}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {props.unassignedSyncEntries.length === 0 ? (
              <p className="text-sm text-cyan-100/80">Every active manual sync item has an owner.</p>
            ) : (
              props.unassignedSyncEntries.slice(0, 3).map((entry) => (
                <div key={`${entry.key}-unassigned`} className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-sm font-medium text-white">{entry.groupName}</p>
                  <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                  <p className="mt-2 text-xs text-cyan-100">
                    {entry.status === "approved" ? "Ready for ownership claim" : "Needs operator completion owner"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.ageMinutes} minutes since last workflow change</p>
                </div>
              ))
            )}
          </div>
        </button>

        <button
          type="button"
          className={`rounded-2xl border p-4 text-left ${
            props.queueAuditFocus === "reassigned"
              ? "border-violet-300/40 bg-violet-300/15"
              : "border-violet-400/20 bg-violet-400/10"
          }`}
          onClick={() => props.onSelectAuditFocus(props.queueAuditFocus === "reassigned" ? "all" : "reassigned")}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Reassigned</p>
            <span className="rounded-full border border-violet-400/30 px-2.5 py-1 text-xs text-violet-100">
              {props.reassignedSyncEntries.length}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {props.reassignedSyncEntries.length === 0 ? (
              <p className="text-sm text-violet-100/80">No ownership changes have been logged yet.</p>
            ) : (
              props.reassignedSyncEntries.slice(0, 3).map((entry) => (
                <div key={`${entry.key}-reassigned`} className="rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                  <p className="text-sm font-medium text-white">{entry.groupName}</p>
                  <p className="mt-1 text-xs text-zinc-400">{entry.followerName}</p>
                  <p className="mt-2 text-xs text-violet-100">
                    {entry.reassignmentCount} ownership change{entry.reassignmentCount === 1 ? "" : "s"}
                  </p>
                  {entry.latestAssignmentReason && (
                    <p className="mt-1 text-xs text-zinc-500">{entry.latestAssignmentReason}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
