import {
  buildCopyGroupHistorySummary,
  type CopyGroupRuntimeSummary,
  type CopyGroupStatus,
} from "@/lib/copy-groups";

interface UseAccountGroupRuntimeStripStateOptions {
  runtimeSummary?: CopyGroupRuntimeSummary;
  resolvedRuntimeStatus: CopyGroupStatus;
  recentErrorCount: number;
  recentWarningCount: number;
  recentLifecycleCount: number;
  recentHealthCount: number;
  latestPreviewMessage?: string;
  latestOperatorAction?: string | null;
  holdReason?: string | null;
}

interface RecoveryActionPlanOptions {
  resolvedRuntimeStatus: CopyGroupStatus;
  lifecycleActionPending: boolean;
  hasMasterWarning: boolean;
  runtimeSummary?: CopyGroupRuntimeSummary;
  groupBoardState?: {
    tone: "ok" | "warn" | "danger" | "muted";
    label: string;
    detail: string;
  };
  latestOperatorAction?: string | null;
  holdReason?: string | null;
}

function describeNextRecoveryStep(input: {
  resolvedRuntimeStatus: CopyGroupStatus;
  holdReason?: string | null;
  latestOperatorAction?: string | null;
  runtimeSummary?: CopyGroupRuntimeSummary;
  recoveryPriorityTone: "ok" | "warn" | "danger" | "muted";
  recoveryPriorityDetail: string;
}) {
  if (input.resolvedRuntimeStatus === "EMERGENCY_STOPPED") {
    return "Review the recovery trail and clear the stop only when the group is safe to stage again.";
  }

  if (input.runtimeSummary?.label === "Restored offline") {
    return "Review recent group history, confirm follower readiness, then stage the group again when it is safe.";
  }

  if (input.holdReason) {
    return input.holdReason;
  }

  if (input.latestOperatorAction) {
    return input.latestOperatorAction;
  }

  if (input.recoveryPriorityTone === "danger" || input.recoveryPriorityTone === "warn") {
    return input.recoveryPriorityDetail;
  }

  return "Continue monitoring the latest runtime signals before the next routing window.";
}

function buildRecoveryChecklist(input: {
  resolvedRuntimeStatus: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  holdReason?: string | null;
  recoveryPriorityTone: "ok" | "warn" | "danger" | "muted";
}) {
  if (input.resolvedRuntimeStatus === "EMERGENCY_STOPPED") {
    return [
      "Review recovery trail",
      "Confirm follower readiness",
      "Clear stop only when safe",
    ];
  }

  if (input.runtimeSummary?.label === "Restored offline") {
    return [
      "Review recent history",
      "Confirm follower readiness",
      "Stage group again",
    ];
  }

  if (input.resolvedRuntimeStatus === "PAUSED" || input.holdReason) {
    return [
      "Check hold condition",
      "Confirm risk posture",
      "Resume when safe",
    ];
  }

  if (input.recoveryPriorityTone === "danger" || input.recoveryPriorityTone === "warn") {
    return [
      "Review latest signal",
      "Confirm routing readiness",
    ];
  }

  return [];
}

export function buildRecoveryActionPlan(input: RecoveryActionPlanOptions) {
  if (input.lifecycleActionPending) {
    return {
      label: "Recovery update in progress",
      detail: "The latest group state change is still saving across the shared board.",
      toneClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    };
  }

  if (input.resolvedRuntimeStatus === "EMERGENCY_STOPPED") {
    return {
      label: "Manual review required",
      detail: "Review the recovery trail, confirm follower readiness, then clear the stop only when the group is safe to stage again.",
      toneClass: "border-red-500/20 bg-red-500/10 text-red-200",
    };
  }

  if (input.runtimeSummary?.label === "Restored offline") {
    return {
      label: "Reload review required",
      detail: "Review recent group history, confirm follower readiness, then stage the group again when it is safe.",
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    };
  }

  if (input.holdReason) {
    return {
      label: "Hold condition active",
      detail: input.holdReason,
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    };
  }

  if (input.resolvedRuntimeStatus === "PAUSED") {
    return {
      label: "Ready for resume check",
      detail:
        input.latestOperatorAction ??
        "Confirm follower readiness and risk state before resuming this copy group.",
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    };
  }

  if (input.hasMasterWarning) {
    return {
      label: "Master still needed",
      detail: "Assign an active master account before starting this copy group.",
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    };
  }

  if (
    input.groupBoardState &&
    (input.groupBoardState.tone === "danger" || input.groupBoardState.tone === "warn")
  ) {
    return {
      label: "Routing attention required",
      detail: input.groupBoardState.detail,
      toneClass:
        input.groupBoardState.tone === "danger"
          ? "border-red-500/20 bg-red-500/10 text-red-200"
          : "border-amber-500/20 bg-amber-500/10 text-amber-100",
    };
  }

  if (input.latestOperatorAction) {
    return {
      label: "Operator follow-up queued",
      detail: input.latestOperatorAction,
      toneClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    };
  }

  return null;
}

export function getSignalMixToneClass(tone: "ok" | "warn" | "danger" | "muted") {
  if (tone === "danger") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (tone === "warn") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (tone === "ok") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

export function getRecoverySeverityToneClass(
  tone: "ok" | "warn" | "danger" | "muted",
) {
  if (tone === "danger") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (tone === "warn") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (tone === "ok") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

export function shouldShowAccountGroupRecoveryPriority(input: {
  recentErrorCount: number;
  recentWarningCount: number;
  recentLifecycleCount: number;
  recentHealthCount: number;
  holdReason?: string | null;
}) {
  return (
    input.recentErrorCount > 0 ||
    input.recentWarningCount > 0 ||
    input.recentLifecycleCount > 0 ||
    input.recentHealthCount > 0 ||
    Boolean(input.holdReason)
  );
}

export function shouldShowAccountGroupNextRecoveryStep(input: {
  showRecoveryPriority: boolean;
  runtimeSummary?: CopyGroupRuntimeSummary;
}) {
  return (
    input.showRecoveryPriority ||
    input.runtimeSummary?.label === "Restored offline"
  );
}

export function shouldShowAccountGroupRecoverySnapshot(input: {
  recentErrorCount: number;
  recentWarningCount: number;
  recentLifecycleCount: number;
  recentHealthCount: number;
  latestPreviewMessage?: string;
}) {
  return (
    input.recentErrorCount > 0 ||
    input.recentWarningCount > 0 ||
    input.recentLifecycleCount > 0 ||
    input.recentHealthCount > 0 ||
    Boolean(input.latestPreviewMessage)
  );
}

export function shouldShowAccountGroupRecoveryTrail(input: {
  showRecoverySnapshot: boolean;
  severityLabel: string;
  lifecycleHeadline: string;
}) {
  return (
    input.showRecoverySnapshot ||
    input.severityLabel !== "No recent updates" ||
    input.lifecycleHeadline !== "No lifecycle actions captured yet."
  );
}

function isRestartRecoveryPreviewMessage(message: string): boolean {
  return (
    message.startsWith("Recovered copy group ") ||
    message.startsWith("Restored paused copy group ")
  );
}

export function useAccountGroupRuntimeStripState(
  options: UseAccountGroupRuntimeStripStateOptions,
) {
  const previewTimestamp = new Date(0).toISOString();
  const recoverySummary = buildCopyGroupHistorySummary(
    options.latestPreviewMessage
      ? [
          {
            eventId: "runtime-preview",
            groupId: "runtime-preview",
            timestamp: previewTimestamp,
            severity:
              options.recentErrorCount > 0
                ? "ERROR"
                : options.recentWarningCount > 0
                  ? "WARN"
                  : "INFO",
            category:
              options.recentHealthCount > 0
                ? "HEALTH"
                : options.recentLifecycleCount > 0
                  ? "LIFECYCLE"
                  : "EXECUTION",
            message: options.latestPreviewMessage,
          },
        ]
      : [],
    {
      groupId: "runtime-preview",
      recentActivity: [],
      totalEvents:
        options.recentErrorCount +
        options.recentWarningCount +
        options.recentLifecycleCount +
        options.recentHealthCount,
      infoEventCount:
        options.recentErrorCount === 0 &&
        options.recentWarningCount === 0 &&
        (options.recentLifecycleCount > 0 ||
          options.recentHealthCount > 0 ||
          Boolean(options.latestPreviewMessage))
          ? 1
          : 0,
      warningEventCount: options.recentWarningCount,
      errorEventCount: options.recentErrorCount,
      restartRecoveryCount:
        options.latestPreviewMessage &&
        isRestartRecoveryPreviewMessage(options.latestPreviewMessage)
          ? 1
          : 0,
      categoryCounts: {
        lifecycle: options.recentLifecycleCount,
        trade: 0,
        rule: 0,
        intent: 0,
        execution:
          options.latestPreviewMessage &&
          options.recentLifecycleCount === 0 &&
          options.recentHealthCount === 0
            ? 1
            : 0,
        health: options.recentHealthCount,
      },
      lifecycleCounts: {
        started: 0,
        paused: options.resolvedRuntimeStatus === "PAUSED" ? 1 : 0,
        resumed: 0,
        stopped: 0,
        emergencyStopped:
          options.resolvedRuntimeStatus === "EMERGENCY_STOPPED" ? 1 : 0,
      },
      lastEventAt: undefined,
      lastLifecycleAt: undefined,
      lastLifecycleMessage:
        options.holdReason ??
        options.latestOperatorAction ??
        options.latestPreviewMessage,
      lastErrorAt: undefined,
      lastErrorMessage:
        options.recentErrorCount > 0 ? options.latestPreviewMessage : undefined,
      lastRestartRecoveryAt:
        options.latestPreviewMessage &&
        isRestartRecoveryPreviewMessage(options.latestPreviewMessage)
          ? previewTimestamp
          : undefined,
      lastRestartRecoveryMessage:
        options.latestPreviewMessage &&
        isRestartRecoveryPreviewMessage(options.latestPreviewMessage)
          ? options.latestPreviewMessage
          : undefined,
    },
  );

  const nextRecoveryStep = describeNextRecoveryStep({
    resolvedRuntimeStatus: options.resolvedRuntimeStatus,
    holdReason: options.holdReason,
    latestOperatorAction: options.latestOperatorAction,
    runtimeSummary: options.runtimeSummary,
    recoveryPriorityTone: recoverySummary.recoveryPriorityTone,
    recoveryPriorityDetail: recoverySummary.recoveryPriorityDetail,
  });
  const recoveryChecklist = buildRecoveryChecklist({
    resolvedRuntimeStatus: options.resolvedRuntimeStatus,
    runtimeSummary: options.runtimeSummary,
    holdReason: options.holdReason,
    recoveryPriorityTone: recoverySummary.recoveryPriorityTone,
  });

  const showRecoveryPriority = shouldShowAccountGroupRecoveryPriority({
    recentErrorCount: options.recentErrorCount,
    recentWarningCount: options.recentWarningCount,
    recentLifecycleCount: options.recentLifecycleCount,
    recentHealthCount: options.recentHealthCount,
    holdReason: options.holdReason,
  });
  const showNextRecoveryStep = shouldShowAccountGroupNextRecoveryStep({
    showRecoveryPriority,
    runtimeSummary: options.runtimeSummary,
  });
  const showRecoverySnapshot = shouldShowAccountGroupRecoverySnapshot({
    recentErrorCount: options.recentErrorCount,
    recentWarningCount: options.recentWarningCount,
    recentLifecycleCount: options.recentLifecycleCount,
    recentHealthCount: options.recentHealthCount,
    latestPreviewMessage: options.latestPreviewMessage,
  });
  const showRecoveryTrail = shouldShowAccountGroupRecoveryTrail({
    showRecoverySnapshot,
    severityLabel: recoverySummary.severityLabel,
    lifecycleHeadline: recoverySummary.lifecycleHeadline,
  });
  const signalMixBadges = recoverySummary.categoryBadges.filter(
    (badge) => badge.value > 0,
  );

  return {
    recoverySummary,
    nextRecoveryStep,
    recoveryChecklist,
    showRecoveryPriority,
    showNextRecoveryStep,
    showRecoverySnapshot,
    showRecoveryTrail,
    signalMixBadges,
  };
}
