import { Skeleton } from "@/components/ui/skeleton";
import type { CopyGroupOperatorSummary } from "@/lib/copy-group-operator-log";
import {
  getRecoverySeverityToneClass,
  getSignalMixToneClass,
  useAccountGroupRuntimeStripState,
} from "@/hooks/use-account-group-runtime-strip-state";
import type { CopyGroupRuntimeSummary, CopyGroupStatus } from "@/lib/copy-groups";
import { History, Power, ShieldAlert } from "lucide-react";

interface AccountGroupRuntimeStripProps {
  runtimeLoading: boolean;
  runtimeUnavailable: boolean;
  runtimeSummary?: CopyGroupRuntimeSummary;
  resolvedRuntimeStatus: CopyGroupStatus;
  accountsCount: number;
  isActive: boolean;
  groupBoardState: {
    tone: "ok" | "warn" | "danger" | "muted";
    label: string;
    detail: string;
  };
  routingGate: {
    tone: "ok" | "warn" | "danger" | "muted";
    label: string;
    detail: string;
  };
  recentErrorCount: number;
  recentWarningCount: number;
  recentLifecycleCount: number;
  recentHealthCount: number;
  latestPreviewMessage?: string;
  latestOperatorAction?: string | null;
  holdReason?: string | null;
  operatorSummary?: CopyGroupOperatorSummary | null;
}

export function getAccountGroupRuntimeSummaryPanelClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "bg-red-500/10 border-red-500/20";
  }

  if (tone === "warn") {
    return "bg-amber-500/10 border-amber-500/20";
  }

  if (tone === "ok") {
    return "bg-emerald-500/10 border-emerald-500/20";
  }

  return "bg-white/[0.03] border-white/8";
}

export function getAccountGroupRuntimeSummaryLabelClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "text-red-300";
  }

  if (tone === "warn") {
    return "text-amber-300";
  }

  if (tone === "ok") {
    return "text-emerald-300";
  }

  return "text-zinc-300";
}

export function getAccountGroupRuntimeSummaryDetailClass(
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

  return "text-zinc-400";
}

export function getAccountGroupBoardStatePanelClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "bg-red-500/10 border-red-500/20";
  }

  if (tone === "warn") {
    return "bg-amber-500/10 border-amber-500/20";
  }

  return "bg-white/[0.04] border-white/8";
}

export function getAccountGroupBoardStateBadgeClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (tone === "warn") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

export function getAccountGroupBoardStateDetailClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "text-red-200/80";
  }

  if (tone === "warn") {
    return "text-amber-100/80";
  }

  return "text-zinc-300";
}

export function shouldShowAccountGroupReloadRecoveryBanner(
  runtimeSummary?: CopyGroupRuntimeSummary,
) {
  return runtimeSummary?.label === "Restored offline";
}

export function shouldShowAccountGroupPausedBanner(
  resolvedRuntimeStatus: CopyGroupStatus,
  accountsCount: number,
) {
  return resolvedRuntimeStatus === "PAUSED" && accountsCount > 0;
}

export function shouldShowAccountGroupEmergencyBanner(
  resolvedRuntimeStatus: CopyGroupStatus,
  accountsCount: number,
) {
  return resolvedRuntimeStatus === "EMERGENCY_STOPPED" && accountsCount > 0;
}

export function shouldShowAccountGroupRoutingPosture(
  resolvedRuntimeStatus: CopyGroupStatus,
  isActive: boolean,
  groupBoardStateTone: "ok" | "warn" | "danger" | "muted",
) {
  return (
    resolvedRuntimeStatus !== "EMERGENCY_STOPPED" &&
    isActive &&
    groupBoardStateTone !== "ok"
  );
}

export function shouldShowAccountGroupRoutingGate(input: {
  resolvedRuntimeStatus: CopyGroupStatus;
  accountsCount: number;
  routingGateTone: "ok" | "warn" | "danger" | "muted";
}) {
  return (
    input.accountsCount > 0 &&
    (input.resolvedRuntimeStatus !== "RUNNING" || input.routingGateTone !== "muted")
  );
}

export function AccountGroupRuntimeStrip({
  runtimeLoading,
  runtimeUnavailable,
  runtimeSummary,
  resolvedRuntimeStatus,
  accountsCount,
  isActive,
  groupBoardState,
  routingGate,
  recentErrorCount,
  recentWarningCount,
  recentLifecycleCount,
  recentHealthCount,
  latestPreviewMessage,
  latestOperatorAction,
  holdReason,
  operatorSummary,
}: AccountGroupRuntimeStripProps) {
  const {
    recoverySummary,
    nextRecoveryStep,
    recoveryChecklist,
    showRecoveryPriority,
    showNextRecoveryStep,
    showRecoverySnapshot,
    showRecoveryTrail,
    signalMixBadges,
  } = useAccountGroupRuntimeStripState({
    runtimeSummary,
    resolvedRuntimeStatus,
    recentErrorCount,
    recentWarningCount,
    recentLifecycleCount,
    recentHealthCount,
    latestPreviewMessage,
    latestOperatorAction,
    holdReason,
  });

  return (
    <>
      {runtimeLoading && !runtimeSummary && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-white/8 bg-white/[0.03]">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="h-3 flex-1 max-w-[240px] bg-white/10" />
          <Skeleton className="ml-auto h-3 w-28 bg-white/10" />
        </div>
      )}

      {showRecoveryPriority && (
        <div
          className={`flex flex-wrap items-center gap-2 border-b px-4 py-2 ${
            recoverySummary.recoveryPriorityTone === "danger"
              ? "border-red-500/20 bg-red-500/10"
              : recoverySummary.recoveryPriorityTone === "warn"
                ? "border-amber-500/20 bg-amber-500/10"
                : recoverySummary.recoveryPriorityTone === "ok"
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-white/8 bg-white/[0.02]"
          }`}
        >
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Recovery priority
          </span>
          <span className="text-[11px] font-semibold text-white">
            {recoverySummary.recoveryPriorityLabel}
          </span>
          <span className="text-[11px] text-zinc-300">
            {recoverySummary.recoveryPriorityDetail}
          </span>
        </div>
      )}

      {showNextRecoveryStep && (
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
            Next recovery step
          </span>
          <span className="text-[11px] text-cyan-50/90">
            {nextRecoveryStep}
          </span>
        </div>
      )}

      {recoveryChecklist.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-400/20 bg-cyan-400/5 px-4 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
            Recovery checklist
          </span>
          {recoveryChecklist.map((item) => (
            <span
              key={item}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-50/90"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {runtimeUnavailable && !runtimeLoading && !runtimeSummary && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/20 bg-amber-500/10">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Status unavailable
          </span>
          <span className="text-[11px] text-amber-100/80">
            Copy-group health could not be loaded. Trading preferences on this board were not changed.
          </span>
        </div>
      )}

      {runtimeSummary && (
        <div
          className={`flex items-center gap-2 px-4 py-1.5 border-b ${getAccountGroupRuntimeSummaryPanelClass(
            runtimeSummary.tone,
          )}`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${getAccountGroupRuntimeSummaryLabelClass(
              runtimeSummary.tone,
            )}`}
          >
            {runtimeSummary.label}
          </span>
          <span
            className={`text-[11px] ${getAccountGroupRuntimeSummaryDetailClass(
              runtimeSummary.tone,
            )}`}
          >
            {runtimeSummary.detail}
          </span>
          {runtimeSummary.updatedLabel && (
            <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Updated {runtimeSummary.updatedLabel}
            </span>
          )}
        </div>
      )}

      {shouldShowAccountGroupReloadRecoveryBanner(runtimeSummary) && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/20 bg-amber-500/10">
          <History className="h-3 w-3 text-amber-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Reload recovery
          </span>
          <span className="text-[11px] text-amber-100/80">
            Review recent group history before restarting this copy group.
          </span>
        </div>
      )}

      {operatorSummary && (
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Operator update
          </span>
          <span className="text-[11px] font-semibold text-white">
            {operatorSummary.headline}
          </span>
          <span className="text-[11px] text-cyan-50/85">
            {operatorSummary.detail}
          </span>
          {operatorSummary.updatedLabel && (
            <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">
              Logged {operatorSummary.updatedLabel}
            </span>
          )}
        </div>
      )}

      {shouldShowAccountGroupRoutingGate({
        resolvedRuntimeStatus,
        accountsCount,
        routingGateTone: routingGate.tone,
      }) && (
        <div
          className={`grid gap-1.5 border-b px-4 py-2 ${getAccountGroupBoardStatePanelClass(
            routingGate.tone,
          )}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Routing gate
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getAccountGroupBoardStateBadgeClass(
                routingGate.tone,
              )}`}
            >
              {routingGate.label}
            </span>
          </div>
          <span
            className={`text-[11px] ${getAccountGroupBoardStateDetailClass(
              routingGate.tone,
            )}`}
          >
            {routingGate.detail}
          </span>
        </div>
      )}

      {showRecoverySnapshot && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-white/[0.02] px-4 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Recovery Snapshot
          </span>
          {recentErrorCount > 0 && (
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-200">
              {recentErrorCount} recent error{recentErrorCount === 1 ? "" : "s"}
            </span>
          )}
          {recentWarningCount > 0 && (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              {recentWarningCount} warning{recentWarningCount === 1 ? "" : "s"}
            </span>
          )}
          {recentLifecycleCount > 0 && (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
              {recentLifecycleCount} lifecycle update{recentLifecycleCount === 1 ? "" : "s"}
            </span>
          )}
          {recentHealthCount > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              {recentHealthCount} health signal{recentHealthCount === 1 ? "" : "s"}
            </span>
          )}
          {latestPreviewMessage && (
            <span className="min-w-[220px] flex-1 text-[11px] text-zinc-400">
              Latest: {latestPreviewMessage}
            </span>
          )}
        </div>
      )}

      {signalMixBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-white/[0.02] px-4 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Signal mix
          </span>
          {signalMixBadges.map((badge) => (
              <span
                key={badge.label}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSignalMixToneClass(badge.tone)}`}
              >
                {badge.label} {badge.value}
              </span>
            ))}
        </div>
      )}

      {showRecoveryTrail && (
        <div className="grid gap-1.5 border-b border-white/8 bg-black/10 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Recovery trail
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRecoverySeverityToneClass(recoverySummary.severityTone)}`}
            >
              {recoverySummary.severityLabel}
            </span>
            <span className="text-[11px] text-zinc-400">
              Incident level
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Signal freshness
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRecoverySeverityToneClass(recoverySummary.signalFreshnessTone)}`}
            >
              {recoverySummary.signalFreshnessLabel}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {recoverySummary.signalFreshnessDetail}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Severity detail
            </span>
            <span className="text-[11px] font-semibold text-zinc-200">
              {recoverySummary.severityLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Restart recovery
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRecoverySeverityToneClass(recoverySummary.restartSignalTone)}`}
            >
              {recoverySummary.restartSignalLabel}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {recoverySummary.restartSignalDetail}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Lifecycle pulse
            </span>
            <span className="text-[11px] text-zinc-300">
              {recoverySummary.lifecycleHeadline}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            {recoverySummary.lifecycleDetail}
          </span>
        </div>
      )}

      {(latestOperatorAction || holdReason) && (
        <div className="grid gap-1.5 border-b border-white/8 bg-black/10 px-4 py-2">
          {latestOperatorAction && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Last operator action
              </span>
              <span className="text-[11px] text-zinc-300">
                {latestOperatorAction}
              </span>
            </div>
          )}
          {holdReason && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Hold reason
              </span>
              <span className="text-[11px] text-zinc-400">
                {holdReason}
              </span>
            </div>
          )}
        </div>
      )}

      {shouldShowAccountGroupPausedBanner(resolvedRuntimeStatus, accountsCount) && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 border-b border-red-500/20">
          <Power className="h-3 w-3 text-red-500/70" />
          <span className="text-[11px] font-semibold text-red-500/80 uppercase tracking-wide">Trading paused</span>
        </div>
      )}

      {shouldShowAccountGroupEmergencyBanner(
        resolvedRuntimeStatus,
        accountsCount,
      ) && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/12 border-b border-red-500/30">
          <ShieldAlert className="h-3 w-3 text-red-400" />
          <span className="text-[11px] font-semibold text-red-300 uppercase tracking-wide">
            Emergency stop active
          </span>
        </div>
      )}

      {shouldShowAccountGroupRoutingPosture(
        resolvedRuntimeStatus,
        isActive,
        groupBoardState.tone,
      ) && (
          <div
            className={`grid gap-1.5 px-4 py-2 border-b ${getAccountGroupBoardStatePanelClass(
              groupBoardState.tone,
            )}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Routing posture
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getAccountGroupBoardStateBadgeClass(
                  groupBoardState.tone,
                )}`}
              >
                <ShieldAlert className="h-3 w-3" />
                {groupBoardState.label}
              </span>
            </div>
            <span
              className={`text-[11px] ${getAccountGroupBoardStateDetailClass(
                groupBoardState.tone,
              )}`}
            >
              {groupBoardState.detail}
            </span>
          </div>
        )}
    </>
  );
}
