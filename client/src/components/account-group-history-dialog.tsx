import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CopyGroupActivity, CopyGroupObservability } from "@/lib/copy-groups";
import {
  buildCopyGroupActivityTimeline,
  buildCopyGroupHistorySummary,
} from "@/lib/copy-groups";
import { History } from "lucide-react";

interface AccountGroupHistoryDialogProps {
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyActivity: CopyGroupActivity[];
  historyObservability: CopyGroupObservability | null;
  historyLoading: boolean;
  historyError: string | null;
}

export function getAccountGroupHistoryTonePanelClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "border-red-500/20 bg-red-500/10";
  }

  if (tone === "warn") {
    return "border-amber-500/20 bg-amber-500/10";
  }

  if (tone === "ok") {
    return "border-emerald-500/20 bg-emerald-500/10";
  }

  return "border-white/10 bg-white/[0.03]";
}

export function getAccountGroupHistoryToneBadgeClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "border-red-500/30 text-red-200";
  }

  if (tone === "warn") {
    return "border-amber-500/30 text-amber-100";
  }

  if (tone === "ok") {
    return "border-emerald-500/30 text-emerald-100";
  }

  return "border-white/10 text-zinc-300";
}

export function getAccountGroupHistoryToneTextClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "text-red-200/80";
  }

  if (tone === "warn") {
    return "text-amber-100/80";
  }

  if (tone === "ok") {
    return "text-emerald-100/80";
  }

  return "text-zinc-500";
}

export function AccountGroupHistoryDialog({
  groupName,
  open,
  onOpenChange,
  historyActivity,
  historyObservability,
  historyLoading,
  historyError,
}: AccountGroupHistoryDialogProps) {
  const timelineItems = buildCopyGroupActivityTimeline(historyActivity, 12);
  const historySummary = buildCopyGroupHistorySummary(historyActivity, historyObservability);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
          title="Recent copy-group history"
          type="button"
        >
          <History className="h-3 w-3" />
          History
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{groupName} history</DialogTitle>
          <DialogDescription>
            Recent lifecycle, health, and execution updates captured for this copy group.
          </DialogDescription>
        </DialogHeader>

        {!historyLoading && !historyError && (
          <div
            className={`rounded-xl border px-4 py-3 ${getAccountGroupHistoryTonePanelClass(
              historySummary.severityTone,
            )}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] uppercase tracking-wide ${getAccountGroupHistoryToneBadgeClass(
                  historySummary.severityTone,
                )}`}
              >
                {historySummary.severityLabel}
              </Badge>
              {historySummary.categoryBadges.map((badge) => (
                <span
                  key={badge.label}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getAccountGroupHistoryTonePanelClass(
                    badge.tone,
                  )} ${getAccountGroupHistoryToneBadgeClass(badge.tone)}`}
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{historySummary.lifecycleHeadline}</p>
            <p className="mt-1 text-xs text-zinc-300">{historySummary.lifecycleDetail}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Signal freshness
              </span>
              <span
                className={`text-xs font-semibold ${getAccountGroupHistoryToneTextClass(
                  historySummary.signalFreshnessTone,
                )}`}
              >
                {historySummary.signalFreshnessLabel}
              </span>
              <span className="text-xs text-zinc-300">
                {historySummary.signalFreshnessDetail}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Recovery priority
              </span>
              <span className="text-xs font-semibold text-white">
                {historySummary.recoveryPriorityLabel}
              </span>
              <span className="text-xs text-zinc-300">
                {historySummary.recoveryPriorityDetail}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Restart recovery
              </span>
              <span
                className={`text-xs font-semibold ${getAccountGroupHistoryToneTextClass(
                  historySummary.restartSignalTone,
                )}`}
              >
                {historySummary.restartSignalLabel}
              </span>
              <span className="text-xs text-zinc-300">
                {historySummary.restartSignalDetail}
              </span>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[420px] pr-4">
          <div className="space-y-3">
            {historyLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-zinc-400">
                Loading recent history...
              </div>
            ) : historyError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-6 text-sm text-red-200">
                {historyError}
              </div>
            ) : timelineItems.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-zinc-400">
                No recent history yet. Group registration and runtime changes will appear here.
              </div>
            ) : (
              timelineItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border px-4 py-3 ${getAccountGroupHistoryTonePanelClass(
                    item.tone,
                  )}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase tracking-wide ${getAccountGroupHistoryToneBadgeClass(
                        item.tone,
                      )}`}
                    >
                      {item.category}
                    </Badge>
                    <span
                      className={`text-[10px] uppercase tracking-[0.18em] ${getAccountGroupHistoryToneTextClass(
                        item.tone,
                      )}`}
                    >
                      {item.timestampLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
