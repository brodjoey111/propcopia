import {
  describeGroupRiskSummary,
  summarizeGroupRisk,
  type AccountRiskItem,
} from "@/lib/account-risk";
import {
  describeCopyGroupBoardState,
  type CopyGroupActivity,
  type CopyGroupRuntimeSummary,
  type CopyGroupStatus,
} from "@/lib/copy-groups";
import type { CopyGroupOperatorSummary } from "@/lib/copy-group-operator-log";
import type { Account } from "@shared/schema";

interface TradingGroupLike {
  id: string;
  name: string;
  color: string;
  isActive?: boolean;
  masterId?: string | null;
  disabledAccountIds?: string[];
  runtimePreference?: "ready" | "paused" | "emergency_stopped";
}

interface UseAccountGroupLaneStateOptions {
  group: TradingGroupLike;
  accounts: Account[];
  isUngrouped?: boolean;
  accountRiskById?: Record<string, AccountRiskItem | undefined>;
  runtimeStatus?: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  recentActivityPreview?: CopyGroupActivity[];
}

export function buildAccountGroupLaneActivitySummary(
  recentActivityPreview: CopyGroupActivity[],
) {
  return {
    recentWarningCount: recentActivityPreview.filter(
      (entry) => entry.severity === "WARN",
    ).length,
    recentErrorCount: recentActivityPreview.filter(
      (entry) => entry.severity === "ERROR",
    ).length,
    recentLifecycleCount: recentActivityPreview.filter(
      (entry) => entry.category === "LIFECYCLE",
    ).length,
    recentHealthCount: recentActivityPreview.filter(
      (entry) => entry.category === "HEALTH",
    ).length,
    latestPreviewMessage: recentActivityPreview[0]?.message,
  };
}

export function findLatestRestartRecoveryMessage(
  recentActivityPreview: CopyGroupActivity[],
) {
  return recentActivityPreview.find(
    (entry) =>
      entry.category === "LIFECYCLE" &&
      (entry.message.startsWith("Recovered copy group ") ||
        entry.message.startsWith("Restored paused copy group ")),
  )?.message;
}

export function buildAccountGroupLaneRoutingGate(input: {
  resolvedRuntimeStatus: CopyGroupStatus;
  effectiveMasterId: string | null;
  accounts: Account[];
  disabledIds: string[];
  groupRiskTone: "ok" | "warn" | "danger" | "muted";
  recentActivityPreview: CopyGroupActivity[];
}) {
  const activeFollowerAccounts = input.accounts.filter(
    (account) =>
      account.accountType !== "master" &&
      !input.disabledIds.includes(account.id),
  );
  const connectedFollowerCount = activeFollowerAccounts.filter(
    (account) => account.isConnected,
  ).length;
  const totalFollowerCount = activeFollowerAccounts.length;
  const masterConnected = input.effectiveMasterId
    ? Boolean(
        input.accounts.find((account) => account.id === input.effectiveMasterId)
          ?.isConnected,
      )
    : false;
  const latestRestartRecoveryMessage = findLatestRestartRecoveryMessage(
    input.recentActivityPreview,
  );
  const disconnectedFollowers = Math.max(
    totalFollowerCount - connectedFollowerCount,
    0,
  );
  const label =
    input.resolvedRuntimeStatus === "PAUSED"
      ? "Resume gate"
      : input.resolvedRuntimeStatus === "STOPPED"
        ? "Stage gate"
        : "Routing gate";
  const actionPhrase =
    input.resolvedRuntimeStatus === "PAUSED"
      ? "resume this group"
      : input.resolvedRuntimeStatus === "STOPPED"
        ? "stage this group again"
        : "route this group again";

  if (
    input.resolvedRuntimeStatus === "EMERGENCY_STOPPED" ||
    input.groupRiskTone === "danger"
  ) {
    return {
      label: "Recovery gate",
      detail: "Clear the active runtime blocker before you reuse this copy group.",
      tone: "danger" as const,
    };
  }

  if (!masterConnected) {
    return {
      label,
      detail: `Reconnect the master account before you ${actionPhrase}.`,
      tone: "danger" as const,
    };
  }

  if (totalFollowerCount === 0) {
    return {
      label,
      detail: "Assign at least one follower account before routing this copy group again.",
      tone: "warn" as const,
    };
  }

  if (disconnectedFollowers > 0) {
    return {
      label,
      detail: `Reconnect ${disconnectedFollowers} follower${disconnectedFollowers === 1 ? "" : "s"} before you ${actionPhrase}.`,
      tone: "warn" as const,
    };
  }

  if (
    latestRestartRecoveryMessage &&
    (input.resolvedRuntimeStatus === "PAUSED" ||
      input.resolvedRuntimeStatus === "STOPPED")
  ) {
    return {
      label,
      detail: "Review the reload recovery trail, then route the group only when the next session setup looks safe.",
      tone: "warn" as const,
    };
  }

  if (input.groupRiskTone === "warn") {
    return {
      label: input.resolvedRuntimeStatus === "RUNNING" ? "Routing gate" : label,
      detail: "Confirm the degraded signal is stable before the next routing window.",
      tone: "warn" as const,
    };
  }

  if (input.resolvedRuntimeStatus === "PAUSED") {
    return {
      label,
      detail: "Master and followers look ready. Resume when the next routing window opens.",
      tone: "ok" as const,
    };
  }

  if (input.resolvedRuntimeStatus === "STOPPED") {
    return {
      label,
      detail: "Master and followers look ready. Stage this group when you are ready to route again.",
      tone: "ok" as const,
    };
  }

  return {
    label: "Routing gate",
    detail: "Keep monitoring the live signal mix before the next routing window.",
    tone: "muted" as const,
  };
}

export function useAccountGroupLaneState({
  group,
  accounts,
  isUngrouped = false,
  accountRiskById = {},
  runtimeStatus,
  runtimeSummary,
  recentActivityPreview = [],
}: UseAccountGroupLaneStateOptions) {
  const accentColor = isUngrouped ? "#94a3b8" : group.color;
  const resolvedRuntimeStatus = isUngrouped
    ? "RUNNING"
    : (runtimeStatus ?? getLocalRuntimeStatus(group));
  const isActive = resolvedRuntimeStatus !== "PAUSED" && resolvedRuntimeStatus !== "EMERGENCY_STOPPED";
  const masterId = group.masterId ?? null;
  const disabledIds = isUngrouped ? [] : (group.disabledAccountIds ?? []);
  const effectiveMasterId = masterId && !disabledIds.includes(masterId) ? masterId : null;
  const followerAccounts = accounts.filter((account) => account.accountType !== "master");
  const hasMasterWarning = !isUngrouped && !effectiveMasterId && accounts.some((account) => !disabledIds.includes(account.id));
  const activeFollowerCount = followerAccounts.filter((account) => !disabledIds.includes(account.id)).length;
  const groupRiskSummary = summarizeGroupRisk({
    accountIds: followerAccounts.map((account) => account.id),
    accountRiskById,
    disabledAccountIds: disabledIds,
  });
  const groupRiskDetail = describeGroupRiskSummary(groupRiskSummary, activeFollowerCount);
  const groupBoardState = describeCopyGroupBoardState({
    isActive,
    activeAccountCount: accounts.filter((account) => !disabledIds.includes(account.id)).length,
    hasMasterWarning,
    riskSummary: groupRiskSummary,
    riskDetail: groupRiskDetail,
  });
  const groupRiskToneClass =
    groupRiskSummary.tone === "ok"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : groupRiskSummary.tone === "warn"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : groupRiskSummary.tone === "danger"
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-white/10 bg-white/[0.04] text-zinc-300";
  const {
    recentWarningCount,
    recentErrorCount,
    recentLifecycleCount,
    recentHealthCount,
    latestPreviewMessage,
  } = buildAccountGroupLaneActivitySummary(recentActivityPreview);
  const latestOperatorAction = describeLatestOperatorAction(recentActivityPreview);
  const holdReason = describeHoldReason({
    runtimeStatus: resolvedRuntimeStatus,
    runtimeSummary,
    riskDetail: groupRiskDetail,
    recentActivityPreview,
  });
  const routingGate = buildAccountGroupLaneRoutingGate({
    resolvedRuntimeStatus,
    effectiveMasterId,
    accounts,
    disabledIds,
    groupRiskTone: groupRiskSummary.tone,
    recentActivityPreview,
  });

  return {
    accentColor,
    resolvedRuntimeStatus,
    isActive,
    masterId,
    disabledIds,
    effectiveMasterId,
    hasMasterWarning,
    groupBoardState,
    groupRiskToneClass,
    recentWarningCount,
    recentErrorCount,
    recentLifecycleCount,
    recentHealthCount,
    latestPreviewMessage,
    latestOperatorAction,
    holdReason,
    routingGate,
  };
}

export function getLocalRuntimeStatus(group: TradingGroupLike): CopyGroupStatus {
  if (group.runtimePreference === "emergency_stopped") {
    return "EMERGENCY_STOPPED";
  }

  if (group.runtimePreference === "paused" || group.isActive === false) {
    return "PAUSED";
  }

  return "STOPPED";
}

export function describeLatestOperatorAction(
  recentActivityPreview: CopyGroupActivity[],
): string | null {
  const lifecycleEntry = recentActivityPreview.find((entry) => entry.category === "LIFECYCLE");
  if (!lifecycleEntry) {
    return null;
  }

  if (lifecycleEntry.message.startsWith("Emergency stop activated")) {
    return "Emergency stop applied";
  }

  if (lifecycleEntry.message.includes(" paused.")) {
    return "Paused by operator";
  }

  if (lifecycleEntry.message.includes(" resumed.")) {
    return "Resumed by operator";
  }

  if (lifecycleEntry.message.startsWith("Restored emergency stop")) {
    return "Emergency stop restored after reload";
  }

  if (lifecycleEntry.message.startsWith("Restored paused copy group")) {
    return "Paused state restored after reload";
  }

  if (lifecycleEntry.message.startsWith("Recovered copy group")) {
    return "Recovered into ready state after reload";
  }

  return lifecycleEntry.message;
}

export function describeHoldReason(input: {
  runtimeStatus: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  riskDetail: { detail: string; tone: "ok" | "warn" | "danger" | "muted" };
  recentActivityPreview: CopyGroupActivity[];
}): string | null {
  const latestLifecycleEntry = input.recentActivityPreview.find((entry) => entry.category === "LIFECYCLE");

  if (input.runtimeStatus === "EMERGENCY_STOPPED") {
    return latestLifecycleEntry?.message ?? input.runtimeSummary?.detail ?? "Emergency stop is active until the group is cleared.";
  }

  if (input.runtimeStatus === "PAUSED") {
    if (input.riskDetail.tone === "danger" || input.riskDetail.tone === "warn") {
      return input.riskDetail.detail;
    }

    return latestLifecycleEntry?.message ?? input.runtimeSummary?.detail ?? "This group is paused until an operator resumes it.";
  }

  if (input.riskDetail.tone === "danger") {
    return input.riskDetail.detail;
  }

  return null;
}
