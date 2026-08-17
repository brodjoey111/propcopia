import type { RiskSettings } from "@/components/risk-settings-dialog";

export type CopyGroupStatus =
  | "STOPPED"
  | "STARTING"
  | "RUNNING"
  | "PAUSED"
  | "STOPPING"
  | "EMERGENCY_STOPPED"
  | "ERROR";

export type CopyGroupHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "UNHEALTHY";

export type CopyGroupActivitySeverity =
  | "INFO"
  | "WARN"
  | "ERROR";

export type CopyGroupActivityCategory =
  | "LIFECYCLE"
  | "TRADE"
  | "RULE"
  | "INTENT"
  | "EXECUTION"
  | "HEALTH";

export interface CopyGroupActivity {
  eventId: string;
  groupId: string;
  timestamp: string;
  severity: CopyGroupActivitySeverity;
  category: CopyGroupActivityCategory;
  message: string;
  intentId?: string;
  followerAccountId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface CopyGroupStatistics {
  groupId: string;
  tradesObserved: number;
  intentsCreated: number;
  intentsSent: number;
  intentsAcknowledged: number;
  intentsFilled: number;
  intentsRejected: number;
  intentsCancelled: number;
  intentsFailed: number;
  followerOrdersSubmitted: number;
  followerOrdersSucceeded: number;
  followerOrdersFailed: number;
  skippedBlockedSymbolCount: number;
  skippedDisabledFollowerCount: number;
  skippedZeroQuantityCount: number;
  avgDispatchLatencyMs: number;
  p50DispatchLatencyMs: number;
  p95DispatchLatencyMs: number;
  p99DispatchLatencyMs: number;
  lastUpdatedAt: string;
}

export interface CopyGroupHealth {
  groupId: string;
  status: CopyGroupHealthStatus;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

export interface CopyGroupRuntimeState {
  groupId: string;
  status: CopyGroupStatus;
  startedAt?: string;
  stoppedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  emergencyStoppedAt?: string;
  isKillSwitchActive: boolean;
  emergencyStopReason?: string;
  masterConnected: boolean;
  connectedFollowerCount: number;
  totalFollowerCount: number;
  lastMasterFillAt?: string;
  lastIntentCreatedAt?: string;
  lastExecutionAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
}

export interface CopyGroup {
  groupId: string;
  name: string;
  masterAccountId: string;
  followerAccountIds: string[];
  runtime: CopyGroupRuntimeState;
  statistics: CopyGroupStatistics;
  health: CopyGroupHealth;
}

export interface CopyGroupActivityFeedItem {
  id: string;
  groupId: string;
  groupName: string;
  timestamp: string;
  message: string;
  type: "trade" | "connection" | "error" | "success";
  severity: CopyGroupActivitySeverity;
  category: CopyGroupActivityCategory;
  intentId?: string;
  followerAccountId?: string;
  relatedCount?: number;
  relatedMessages?: string[];
}

export interface CopyGroupActivityTimelineItem {
  id: string;
  timestamp: string;
  timestampLabel: string;
  message: string;
  severity: CopyGroupActivitySeverity;
  category: CopyGroupActivityCategory;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface CopyGroupObservability {
  groupId: string;
  recentActivity: CopyGroupActivity[];
  totalEvents: number;
  infoEventCount: number;
  warningEventCount: number;
  errorEventCount: number;
  restartRecoveryCount: number;
  categoryCounts: {
    lifecycle: number;
    trade: number;
    rule: number;
    intent: number;
    execution: number;
    health: number;
  };
  lifecycleCounts: {
    started: number;
    paused: number;
    resumed: number;
    stopped: number;
    emergencyStopped: number;
  };
  lastEventAt?: string;
  lastLifecycleAt?: string;
  lastLifecycleMessage?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  lastRestartRecoveryAt?: string;
  lastRestartRecoveryMessage?: string;
}

export interface CopyGroupHistorySummary {
  lifecycleHeadline: string;
  lifecycleDetail: string;
  severityLabel: string;
  severityTone: "ok" | "warn" | "danger" | "muted";
  signalFreshnessLabel: string;
  signalFreshnessDetail: string;
  signalFreshnessTone: "ok" | "warn" | "danger" | "muted";
  recoveryPriorityLabel: string;
  recoveryPriorityDetail: string;
  recoveryPriorityTone: "ok" | "warn" | "danger" | "muted";
  restartSignalLabel: string;
  restartSignalDetail: string;
  restartSignalTone: "ok" | "warn" | "danger" | "muted";
  categoryBadges: Array<{
    label: string;
    value: number;
    tone: "ok" | "warn" | "danger" | "muted";
  }>;
}

export interface CopyGroupOverview {
  totalGroups: number;
  runningGroups: number;
  pausedGroups: number;
  stoppedGroups: number;
  errorGroups: number;
  degradedGroups: number;
  unhealthyGroups: number;
  connectedFollowers: number;
  totalFollowers: number;
  avgDispatchLatencyMs: number | null;
}

export type CopySessionSignalState = "ok" | "watch" | "alert" | "standby";

export interface CopySessionSignalRow {
  label: string;
  value: string;
  state: CopySessionSignalState;
}

export interface CopyGroupPulseSummary {
  headline: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface CopyGroupHealthWatchlistEntry {
  groupId: string;
  groupName: string;
  status: CopyGroupStatus;
  healthStatus: CopyGroupHealthStatus;
  tone: "ok" | "warn" | "danger" | "muted";
  followerReadinessLabel: string;
  concernLabel: string;
  detail: string;
  signalFreshnessLabel: string;
  signalFreshnessDetail: string;
  signalFreshnessTone: "ok" | "warn" | "danger" | "muted";
  routingGateLabel: string;
  routingGateDetail: string;
  routingGateTone: "ok" | "warn" | "danger" | "muted";
  recoveryQueueLabel: string;
  recoveryQueueDetail: string;
  latestRecoveryActionLabel?: string;
  latestRecoveryActionAt?: string;
  latestRestartRecoveryLabel?: string;
  latestRestartRecoveryAt?: string;
  lastStableSignalLabel?: string;
  timeInConcernStateLabel?: string;
}

export interface CopyGroupHealthWatchlistSummary {
  entries: CopyGroupHealthWatchlistEntry[];
  counts: {
    attention: number;
    degraded: number;
    paused: number;
    disconnectedFollowers: number;
  };
}

export interface CopyGroupBoardStateSummary {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface CopyGroupRuntimeSummary {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
  updatedLabel?: string;
}

export interface CopyGroupRestartRecoveryItem {
  groupId: string;
  groupName: string;
  label: string;
  detail: string;
  tone: "ok" | "warn";
  updatedLabel?: string;
  capturedAt?: string;
}

function formatRuntimeUpdatedLabel(timestamp?: string): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatActivityTimestampLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function toActivityTone(
  severity: CopyGroupActivitySeverity,
  category: CopyGroupActivityCategory,
): CopyGroupActivityTimelineItem["tone"] {
  if (severity === "ERROR") {
    return "danger";
  }

  if (severity === "WARN") {
    return "warn";
  }

  if (category === "TRADE" || category === "EXECUTION" || category === "INTENT") {
    return "ok";
  }

  return "muted";
}

export interface CopySessionStatusSnapshot {
  masterConnected: boolean;
  followerCount: number;
  connectedFollowerCount: number;
  ready: boolean;
  followers: Array<{
    health: "ready" | "reconnecting" | "unavailable";
  }>;
}

export interface RegisteredCopyGroupApiRecord {
  group: {
    groupId: string;
    name: string;
    masterAccountId: string;
    followerAccountIds: string[];
  };
}

export interface CopyGroupDetailApiRecord {
  group: RegisteredCopyGroupApiRecord;
  runtime?: {
    state?: CopyGroupRuntimeState;
    statistics?: CopyGroupStatistics;
    health?: CopyGroupHealth;
  };
}

export interface CopyGroupSnapshotApiRecord extends CopyGroupDetailApiRecord {
  board?: {
    color?: string;
    position?: number;
    riskSettings?: Partial<RiskSettings>;
  };
  runtimeSummary?: CopyGroupRuntimeSummary;
  activityPreview: CopyGroupActivity[];
}

export interface CopyGroupSnapshotApiResponse {
  success: boolean;
  generatedAt: string;
  runningGroups: string[];
  groups: CopyGroupSnapshotApiRecord[];
}

function toActivityType(
  severity: CopyGroupActivitySeverity,
  category: CopyGroupActivityCategory,
): CopyGroupActivityFeedItem["type"] {
  if (severity === "ERROR") {
    return "error";
  }

  if (category === "TRADE" || category === "EXECUTION" || category === "INTENT") {
    return "trade";
  }

  if (category === "LIFECYCLE" || category === "HEALTH") {
    return "connection";
  }

  return severity === "WARN" ? "connection" : "success";
}

function formatCompactTimestamp(timestamp: string): string | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDurationLabel(startTimestamp: string, endTimestamp = new Date().toISOString()): string | null {
  const start = new Date(startTimestamp).getTime();
  const end = new Date(endTimestamp).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const totalMinutes = Math.max(Math.floor((end - start) / 60_000), 0);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0
      ? `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`
      : `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0
    ? `${days} day${days === 1 ? "" : "s"} ${remainingHours} hour${remainingHours === 1 ? "" : "s"}`
    : `${days} day${days === 1 ? "" : "s"}`;
}

export function summarizeCopyGroups(groups: CopyGroup[]): CopyGroupOverview {
  const latencySamples = groups
    .map((group) => group.statistics.avgDispatchLatencyMs)
    .filter((value) => Number.isFinite(value) && value > 0);

  const avgDispatchLatencyMs = latencySamples.length > 0
    ? latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length
    : null;

  return {
    totalGroups: groups.length,
    runningGroups: groups.filter((group) => group.runtime.status === "RUNNING").length,
    pausedGroups: groups.filter((group) => group.runtime.status === "PAUSED").length,
    stoppedGroups: groups.filter((group) => group.runtime.status === "STOPPED").length,
    errorGroups: groups.filter((group) =>
      group.runtime.status === "ERROR" || group.runtime.status === "EMERGENCY_STOPPED"
    ).length,
    degradedGroups: groups.filter((group) => group.health.status === "DEGRADED").length,
    unhealthyGroups: groups.filter((group) => group.health.status === "UNHEALTHY").length,
    connectedFollowers: groups.reduce((sum, group) => sum + group.runtime.connectedFollowerCount, 0),
    totalFollowers: groups.reduce((sum, group) => sum + group.runtime.totalFollowerCount, 0),
    avgDispatchLatencyMs,
  };
}

export function describeCopyGroupPulse(
  overview: CopyGroupOverview,
): CopyGroupPulseSummary {
  const followerReadiness = overview.totalFollowers > 0
    ? `${overview.connectedFollowers}/${overview.totalFollowers} followers ready`
    : "No followers assigned yet";
  const latencyDetail = overview.avgDispatchLatencyMs === null
    ? "Dispatch timing will appear after the first copied trades."
    : `Average dispatch latency is ${overview.avgDispatchLatencyMs.toFixed(1)} ms.`;

  if (overview.totalGroups === 0) {
    return {
      headline: "No copy groups yet",
      detail: "Create a group to begin routing followers and runtime alerts.",
      tone: "muted",
    };
  }

  if (overview.unhealthyGroups > 0) {
    return {
      headline: `${overview.unhealthyGroups} group${overview.unhealthyGroups === 1 ? "" : "s"} need attention`,
      detail: `${followerReadiness}. ${latencyDetail}`,
      tone: "danger",
    };
  }

  if (overview.degradedGroups > 0) {
    return {
      headline: `${overview.degradedGroups} group${overview.degradedGroups === 1 ? "" : "s"} on watch`,
      detail: `${followerReadiness}. ${latencyDetail}`,
      tone: "warn",
    };
  }

  if (overview.runningGroups > 0) {
    return {
      headline: `${overview.runningGroups} group${overview.runningGroups === 1 ? "" : "s"} running cleanly`,
      detail: `${followerReadiness}. ${latencyDetail}`,
      tone: "ok",
    };
  }

  if (overview.pausedGroups > 0) {
    return {
      headline: `${overview.pausedGroups} group${overview.pausedGroups === 1 ? "" : "s"} paused`,
      detail: `${followerReadiness}. ${latencyDetail}`,
      tone: "warn",
    };
  }

  return {
    headline: "Groups ready to start",
    detail: `${followerReadiness}. ${latencyDetail}`,
    tone: "ok",
  };
}

export function buildCopyGroupHealthWatchlist(
  groups: CopyGroup[],
  activityByGroupId: Record<string, CopyGroupActivity[]> = {},
  now = new Date().toISOString(),
): CopyGroupHealthWatchlistSummary {
  const entries: CopyGroupHealthWatchlistEntry[] = [];

  for (const group of groups) {
      const activity = activityByGroupId[group.groupId] ?? [];
      const disconnectedFollowers = Math.max(
        group.runtime.totalFollowerCount - group.runtime.connectedFollowerCount,
        0,
      );
      const followerReadinessLabel =
        group.runtime.totalFollowerCount > 0
          ? `${group.runtime.connectedFollowerCount}/${group.runtime.totalFollowerCount} followers ready`
          : "No followers assigned";
      const primaryHealthIssue =
        group.health.errors[0] ??
        group.health.warnings[0] ??
        group.runtime.lastErrorMessage ??
        null;
      const latestRecoveryAction = activity.find(
        (entry) =>
          entry.severity === "INFO" &&
          entry.category === "LIFECYCLE" &&
          /recovered|resumed|started|synchronized|stopped|registered/i.test(entry.message),
      );
      const lastStableSignalTimestamp =
        group.health.status === "HEALTHY"
          ? group.statistics.lastUpdatedAt ??
            group.runtime.lastExecutionAt ??
            latestRecoveryAction?.timestamp
          : latestRecoveryAction?.timestamp;
      const latestRecoveryActionTime = latestRecoveryAction
        ? formatCompactTimestamp(latestRecoveryAction.timestamp)
        : null;
      const latestRestartRecovery = activity.find(
        (entry) =>
          entry.category === "LIFECYCLE" &&
          isRestartRecoveryMessage(entry.message),
      );
      const latestRestartRecoveryTime = latestRestartRecovery
        ? formatCompactTimestamp(latestRestartRecovery.timestamp)
        : null;
      const lastStableSignalTime = lastStableSignalTimestamp
        ? formatCompactTimestamp(lastStableSignalTimestamp)
        : null;
      const latestSignalAt =
        activity[0]?.timestamp ??
        group.statistics.lastUpdatedAt ??
        group.health.checkedAt ??
        group.runtime.lastExecutionAt ??
        latestRecoveryAction?.timestamp;
      const signalFreshness = buildCopyGroupSignalFreshness({
        latestSignalAt,
        now,
        allowQuiet:
          group.runtime.status === "PAUSED" || group.runtime.status === "STOPPED",
      });
      const routingGate = buildCopyGroupRoutingGate({
        status: group.runtime.status,
        healthStatus: group.health.status,
        masterConnected: group.runtime.masterConnected,
        connectedFollowerCount: group.runtime.connectedFollowerCount,
        totalFollowerCount: group.runtime.totalFollowerCount,
        latestRestartRecoveryMessage: latestRestartRecovery?.message,
      });
      const latestRecoveryActionLabel = latestRecoveryAction
        ? latestRecoveryActionTime
          ? `${latestRecoveryAction.message} ${latestRecoveryActionTime}`
          : latestRecoveryAction.message
        : undefined;
      const latestRestartRecoveryLabel = latestRestartRecovery
        ? latestRestartRecoveryTime
          ? `${latestRestartRecovery.message} ${latestRestartRecoveryTime}`
          : latestRestartRecovery.message
        : undefined;
      const lastStableSignalLabel = lastStableSignalTime
        ? group.health.status === "HEALTHY"
          ? `Healthy signal at ${lastStableSignalTime}`
          : `Last stable signal at ${lastStableSignalTime}`
        : undefined;
      const latestConcernEvent = activity.find(
        (entry) =>
          entry.category === "HEALTH" ||
          (entry.category === "LIFECYCLE" &&
            (entry.severity === "WARN" || entry.severity === "ERROR")),
      );
      const timeInConcernStateLabel = latestConcernEvent
        ? formatDurationLabel(latestConcernEvent.timestamp, now)
        : undefined;

      if (
        group.runtime.status === "ERROR" ||
        group.runtime.status === "EMERGENCY_STOPPED" ||
        group.health.status === "UNHEALTHY"
      ) {
        entries.push({
          groupId: group.groupId,
          groupName: group.name,
          status: group.runtime.status,
          healthStatus: group.health.status,
          tone: "danger" as const,
          followerReadinessLabel,
          concernLabel: "Needs attention",
          detail:
            primaryHealthIssue ??
            (group.runtime.status === "EMERGENCY_STOPPED"
              ? "Emergency stop is active for this group."
              : "A runtime or health error needs operator review."),
          signalFreshnessLabel: signalFreshness.label,
          signalFreshnessDetail: signalFreshness.detail,
          signalFreshnessTone: signalFreshness.tone,
          routingGateLabel: routingGate.label,
          routingGateDetail: routingGate.detail,
          routingGateTone: routingGate.tone,
          recoveryQueueLabel: "Recover now",
          recoveryQueueDetail:
            group.runtime.status === "EMERGENCY_STOPPED"
              ? "Review the recovery trail and clear the stop only when the group is safe to stage again."
              : "Review the runtime blocker before the next copy session.",
          latestRecoveryActionLabel: latestRecoveryActionLabel ?? undefined,
          latestRecoveryActionAt: latestRecoveryAction?.timestamp,
          latestRestartRecoveryLabel: latestRestartRecoveryLabel ?? undefined,
          latestRestartRecoveryAt: latestRestartRecovery?.timestamp,
          lastStableSignalLabel: lastStableSignalLabel ?? undefined,
          timeInConcernStateLabel: timeInConcernStateLabel ?? undefined,
        });
        continue;
      }

      if (group.health.status === "DEGRADED" || disconnectedFollowers > 0) {
        entries.push({
          groupId: group.groupId,
          groupName: group.name,
          status: group.runtime.status,
          healthStatus: group.health.status,
          tone: "warn" as const,
          followerReadinessLabel,
          concernLabel: "On watch",
          detail:
            primaryHealthIssue ??
            (disconnectedFollowers > 0
              ? `${disconnectedFollowers} follower${disconnectedFollowers === 1 ? "" : "s"} not ready.`
              : "Follower readiness needs monitoring."),
          signalFreshnessLabel: signalFreshness.label,
          signalFreshnessDetail: signalFreshness.detail,
          signalFreshnessTone: signalFreshness.tone,
          routingGateLabel: routingGate.label,
          routingGateDetail: routingGate.detail,
          routingGateTone: routingGate.tone,
          recoveryQueueLabel: "Stabilize soon",
          recoveryQueueDetail:
            disconnectedFollowers > 0
              ? "Work follower readiness drift before it turns into a full routing interruption."
              : "Monitor the degraded state and confirm the group is stable before the next copy session.",
          latestRecoveryActionLabel: latestRecoveryActionLabel ?? undefined,
          latestRecoveryActionAt: latestRecoveryAction?.timestamp,
          latestRestartRecoveryLabel: latestRestartRecoveryLabel ?? undefined,
          latestRestartRecoveryAt: latestRestartRecovery?.timestamp,
          lastStableSignalLabel: lastStableSignalLabel ?? undefined,
          timeInConcernStateLabel: timeInConcernStateLabel ?? undefined,
        });
        continue;
      }

      if (group.runtime.status === "PAUSED" || group.runtime.status === "STOPPED") {
        entries.push({
          groupId: group.groupId,
          groupName: group.name,
          status: group.runtime.status,
          healthStatus: group.health.status,
          tone: "muted" as const,
          followerReadinessLabel,
          concernLabel: group.runtime.status === "PAUSED" ? "Paused" : "Stopped",
          detail:
            group.runtime.lastErrorMessage ??
            (group.runtime.status === "PAUSED"
              ? "Copying is paused for this group."
              : "This group is not currently running."),
          signalFreshnessLabel: signalFreshness.label,
          signalFreshnessDetail: signalFreshness.detail,
          signalFreshnessTone: signalFreshness.tone,
          routingGateLabel: routingGate.label,
          routingGateDetail: routingGate.detail,
          routingGateTone: routingGate.tone,
          recoveryQueueLabel:
            group.runtime.status === "PAUSED" ? "Resume check" : "Stage before use",
          recoveryQueueDetail:
            group.runtime.status === "PAUSED"
              ? "Confirm readiness, then resume when the group is safe to route again."
              : "This group is offline until you intentionally stage it again.",
          latestRecoveryActionLabel: latestRecoveryActionLabel ?? undefined,
          latestRecoveryActionAt: latestRecoveryAction?.timestamp,
          latestRestartRecoveryLabel: latestRestartRecoveryLabel ?? undefined,
          latestRestartRecoveryAt: latestRestartRecovery?.timestamp,
          lastStableSignalLabel: lastStableSignalLabel ?? undefined,
          timeInConcernStateLabel: timeInConcernStateLabel ?? undefined,
        });
      }
  }

  const toneRank = new Map<CopyGroupHealthWatchlistEntry["tone"], number>([
    ["danger", 0],
    ["warn", 1],
    ["muted", 2],
    ["ok", 3],
  ]);

  entries.sort((left, right) => {
    const toneDiff =
      (toneRank.get(left.tone) ?? 99) - (toneRank.get(right.tone) ?? 99);
    if (toneDiff !== 0) {
      return toneDiff;
    }

    return left.groupName.localeCompare(right.groupName);
  });

  return {
    entries,
    counts: {
      attention: entries.filter((entry) => entry.tone === "danger").length,
      degraded: entries.filter((entry) => entry.tone === "warn").length,
      paused: entries.filter(
        (entry) => entry.status === "PAUSED" || entry.status === "STOPPED",
      ).length,
      disconnectedFollowers: groups.reduce(
        (sum, group) =>
          sum +
          Math.max(group.runtime.totalFollowerCount - group.runtime.connectedFollowerCount, 0),
        0,
      ),
    },
  };
}

export function buildCopySessionSignalRows(input: {
  usingMockData: boolean;
  connectedAccountsCount: number;
  totalAccountsCount: number;
  breachedRiskCount: number;
  warningRiskCount: number;
  tradeCopyStatus?: CopySessionStatusSnapshot | null;
}): CopySessionSignalRow[] {
  const tradeCopyStatus = input.tradeCopyStatus ?? null;
  const reconnectingFollowers = tradeCopyStatus?.followers.filter(
    (follower) => follower.health === "reconnecting",
  ) ?? [];
  const unavailableFollowers = tradeCopyStatus?.followers.filter(
    (follower) => follower.health === "unavailable",
  ) ?? [];

  return [
    {
      label: "Broker session",
      value: input.usingMockData
        ? "Preview state"
        : tradeCopyStatus?.masterConnected
          ? "Session live"
          : input.connectedAccountsCount > 0
            ? "Accounts linked"
            : "Not started",
      state: input.usingMockData
        ? "ok"
        : tradeCopyStatus?.masterConnected
          ? "ok"
          : input.connectedAccountsCount > 0
            ? "watch"
            : "standby",
    },
    {
      label: "Copy engine",
      value: input.usingMockData
        ? "Preview state"
        : unavailableFollowers.length > 0
          ? "Needs attention"
          : tradeCopyStatus?.ready
            ? "Ready"
            : tradeCopyStatus?.masterConnected
              ? "Session live"
              : "Not started",
      state: input.usingMockData
        ? "ok"
        : unavailableFollowers.length > 0
          ? "alert"
          : tradeCopyStatus?.ready
            ? "ok"
            : tradeCopyStatus?.masterConnected
              ? "watch"
              : "standby",
    },
    {
      label: "Follower readiness",
      value: input.usingMockData
        ? "Preview state"
        : tradeCopyStatus
          ? `${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount} ready`
          : `${input.connectedAccountsCount}/${input.totalAccountsCount} active`,
      state: input.usingMockData
        ? "ok"
        : unavailableFollowers.length > 0
          ? "alert"
          : reconnectingFollowers.length > 0
            ? "watch"
            : !!tradeCopyStatus &&
                tradeCopyStatus.followerCount > 0 &&
                tradeCopyStatus.connectedFollowerCount === tradeCopyStatus.followerCount
              ? "ok"
              : "standby",
    },
    {
      label: "Risk routing",
      value: input.usingMockData
        ? "Preview state"
        : input.breachedRiskCount > 0
          ? `${input.breachedRiskCount} breached`
          : input.warningRiskCount > 0
            ? `${input.warningRiskCount} warning`
            : unavailableFollowers.length > 0
              ? "Needs attention"
              : tradeCopyStatus?.ready
                ? "Protected"
                : tradeCopyStatus?.masterConnected
                  ? "Needs review"
                  : "Not started",
      state: input.usingMockData
        ? "ok"
        : input.breachedRiskCount > 0
          ? "alert"
          : input.warningRiskCount > 0
            ? "watch"
            : unavailableFollowers.length > 0
              ? "alert"
              : tradeCopyStatus?.ready
                ? "ok"
                : tradeCopyStatus?.masterConnected
                  ? "watch"
                  : "standby",
    },
  ];
}

export function describeCopyGroupBoardState(input: {
  isActive: boolean;
  activeAccountCount: number;
  hasMasterWarning: boolean;
  riskSummary: {
    blocked: boolean;
    warningCount: number;
    pendingCount: number;
  };
  riskDetail: {
    headline: string;
    detail: string;
    tone: "ok" | "warn" | "danger" | "muted";
  };
}): CopyGroupBoardStateSummary {
  if (!input.isActive) {
    return {
      label: "Paused",
      detail: "Copying is paused for this group.",
      tone: "warn",
    };
  }

  if (input.activeAccountCount === 0) {
    return {
      label: "Empty",
      detail: "Add accounts to start building this group.",
      tone: "muted",
    };
  }

  if (input.hasMasterWarning) {
    return {
      label: "Choose a master",
      detail: "Set the lead account before starting this group.",
      tone: "warn",
    };
  }

  if (
    input.riskSummary.blocked ||
    input.riskSummary.warningCount > 0 ||
    input.riskSummary.pendingCount > 0
  ) {
    return {
      label: input.riskDetail.headline,
      detail: input.riskDetail.detail,
      tone: input.riskDetail.tone,
    };
  }

  return {
    label: "Ready",
    detail: "This group is ready for live copy-session checks.",
    tone: "ok",
  };
}

export function describeCopyGroupRuntimeSummary(input: {
  status: CopyGroupStatus;
  connectedFollowerCount: number;
  totalFollowerCount: number;
  lastActivityMessage?: string;
  lastUpdatedAt?: string;
  emergencyStopReason?: string;
  healthStatus?: CopyGroupHealthStatus;
}): CopyGroupRuntimeSummary {
  const followerReadiness = input.totalFollowerCount > 0
    ? `${input.connectedFollowerCount}/${input.totalFollowerCount} followers ready.`
    : "No followers assigned yet.";
  const updatedLabel = formatRuntimeUpdatedLabel(input.lastUpdatedAt);
  const restoredOfflineAfterReload =
    input.status === "STOPPED" &&
    !!input.lastActivityMessage &&
    (input.lastActivityMessage.startsWith("Recovered copy group ") ||
      input.lastActivityMessage.startsWith("Restored "));

  if (input.status === "EMERGENCY_STOPPED") {
    return {
      label: "Emergency stop active",
      detail:
        input.emergencyStopReason ??
        input.lastActivityMessage ??
        "This group stays locked until you clear the stop.",
      tone: "danger",
      updatedLabel,
    };
  }

  if (input.status === "PAUSED") {
    return {
      label: "Paused safely",
      detail:
        input.lastActivityMessage ??
        "This group will stay offline until you resume it.",
      tone: "warn",
      updatedLabel,
    };
  }

  if (input.status === "RUNNING") {
    if (input.healthStatus === "UNHEALTHY") {
      return {
        label: "Running with active issues",
        detail: input.lastActivityMessage ?? followerReadiness,
        tone: "danger",
        updatedLabel,
      };
    }

    if (input.healthStatus === "DEGRADED") {
      return {
        label: "Running on watch",
        detail: input.lastActivityMessage ?? followerReadiness,
        tone: "warn",
        updatedLabel,
      };
    }

    return {
      label: "Running cleanly",
      detail: input.lastActivityMessage ?? followerReadiness,
      tone: "ok",
      updatedLabel,
    };
  }

  if (input.status === "STARTING" || input.status === "STOPPING") {
    return {
      label: "Updating state",
      detail: input.lastActivityMessage ?? "Waiting for the latest runtime snapshot.",
      tone: "warn",
      updatedLabel,
    };
  }

  if (input.status === "ERROR") {
    return {
      label: "Needs review",
      detail: input.lastActivityMessage ?? "The group reported an error and should be checked before reuse.",
      tone: "danger",
      updatedLabel,
    };
  }

  if (restoredOfflineAfterReload) {
    return {
      label: "Restored offline",
      detail: input.lastActivityMessage ?? "This group was restored into a safe offline state after reload.",
      tone: "warn",
      updatedLabel,
    };
  }

  return {
    label: "Ready to start",
    detail: input.lastActivityMessage ?? `Configuration saved. ${followerReadiness}`,
    tone: "muted",
    updatedLabel,
  };
}

export function buildCopyGroupRestartRecoveryItems(input: {
  groups: CopyGroup[];
  runtimeSummariesByGroupId?: Record<string, CopyGroupRuntimeSummary | undefined>;
  activityByGroupId?: Record<string, CopyGroupActivity[]>;
  limit?: number;
}): CopyGroupRestartRecoveryItem[] {
  const limit = Number.isFinite(input.limit)
    ? Math.max(1, Math.floor(input.limit ?? 3))
    : 3;
  const items: CopyGroupRestartRecoveryItem[] = [];

  for (const group of input.groups) {
    const runtimeSummary = input.runtimeSummariesByGroupId?.[group.groupId];
    const latestRestartRecovery = (input.activityByGroupId?.[group.groupId] ?? []).find(
      (entry) => entry.category === "LIFECYCLE" && isRestartRecoveryMessage(entry.message),
    );
    const restoredOffline = runtimeSummary?.label === "Restored offline";

    if (!restoredOffline && !latestRestartRecovery) {
      continue;
    }

    const capturedAt =
      latestRestartRecovery?.timestamp ??
      group.runtime.stoppedAt ??
      group.runtime.pausedAt;
    const capturedLabel = capturedAt ? formatCompactTimestamp(capturedAt) : null;

    items.push({
      groupId: group.groupId,
      groupName: group.name,
      label: restoredOffline ? "Restored offline" : "Restart recovery captured",
      detail:
        latestRestartRecovery?.message ??
        runtimeSummary?.detail ??
        "This group was restored into a safe offline state after reload.",
      tone: restoredOffline ? "ok" : "warn",
      updatedLabel: runtimeSummary?.updatedLabel ?? capturedLabel ?? undefined,
      capturedAt: capturedAt ?? undefined,
    });
  }

  return items
    .sort((left, right) => {
      if (left.capturedAt && right.capturedAt) {
        return right.capturedAt.localeCompare(left.capturedAt);
      }

      if (right.capturedAt) {
        return 1;
      }

      if (left.capturedAt) {
        return -1;
      }

      return left.groupName.localeCompare(right.groupName);
    })
    .slice(0, limit);
}

export function buildCopyGroupActivityFeed(
  groups: CopyGroup[],
  activityByGroupId: Record<string, CopyGroupActivity[]>,
): CopyGroupActivityFeedItem[] {
  const groupNameById = new Map(groups.map((group) => [group.groupId, group.name]));

  return Object.entries(activityByGroupId)
    .flatMap(([groupId, activity]) =>
      activity.map((entry) => ({
        id: entry.eventId,
        groupId,
        groupName: groupNameById.get(groupId) ?? groupId,
        timestamp: entry.timestamp,
        message: entry.message,
        type: toActivityType(entry.severity, entry.category),
        severity: entry.severity,
        category: entry.category,
        intentId: entry.intentId,
        followerAccountId: entry.followerAccountId,
      })),
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function buildCopyGroupActivityTimeline(
  activity: CopyGroupActivity[],
  limit = 12,
): CopyGroupActivityTimelineItem[] {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.floor(limit))
    : 12;

  return [...activity]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, safeLimit)
    .map((entry) => ({
      id: entry.eventId,
      timestamp: entry.timestamp,
      timestampLabel: formatActivityTimestampLabel(entry.timestamp),
      message: entry.message,
      severity: entry.severity,
      category: entry.category,
      tone: toActivityTone(entry.severity, entry.category),
    }));
}

function isRestartRecoveryMessage(message: string): boolean {
  return (
    message.startsWith("Recovered copy group ") ||
    message.startsWith("Restored paused copy group ")
  );
}

function formatElapsedDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function buildCopyGroupSignalFreshness(input: {
  latestSignalAt?: string;
  now?: string;
  allowQuiet: boolean;
}): {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
} {
  if (!input.latestSignalAt) {
    return {
      label: "No signal timestamp",
      detail: "This group does not yet have a recent runtime signal timestamp to compare.",
      tone: "muted",
    };
  }

  const nowDate = new Date(input.now ?? new Date().toISOString());
  const lastSignalDate = new Date(input.latestSignalAt);

  if (Number.isNaN(nowDate.getTime()) || Number.isNaN(lastSignalDate.getTime())) {
    return {
      label: "Signal timing unavailable",
      detail: "The latest runtime signal timestamp could not be read.",
      tone: "muted",
    };
  }

  const ageMinutes = Math.max(
    Math.floor((nowDate.getTime() - lastSignalDate.getTime()) / 60_000),
    0,
  );
  const ageLabel = formatElapsedDuration(ageMinutes);
  const timestampLabel = formatActivityTimestampLabel(input.latestSignalAt);

  if (input.allowQuiet) {
    return {
      label: `Quiet ${ageLabel}`,
      detail: `Latest signal logged ${timestampLabel}. Quiet history can be normal while this group remains offline.`,
      tone: "muted",
    };
  }

  if (ageMinutes <= 15) {
    return {
      label: `Fresh ${ageLabel} ago`,
      detail: `Latest signal logged ${timestampLabel}.`,
      tone: "ok",
    };
  }

  if (ageMinutes <= 60) {
    return {
      label: `Quiet ${ageLabel}`,
      detail: `Latest signal logged ${timestampLabel}. Monitor the next routing window before escalating this group.`,
      tone: "muted",
    };
  }

  return {
    label: `Stale ${ageLabel}`,
    detail: `Latest signal logged ${timestampLabel}. Recheck the activity feed if this group should still be active.`,
    tone: "warn",
  };
}

function buildCopyGroupRoutingGate(input: {
  status: CopyGroupStatus;
  healthStatus: CopyGroupHealthStatus;
  masterConnected: boolean;
  connectedFollowerCount: number;
  totalFollowerCount: number;
  latestRestartRecoveryMessage?: string;
}): {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
} {
  const disconnectedFollowers = Math.max(
    input.totalFollowerCount - input.connectedFollowerCount,
    0,
  );
  const label =
    input.status === "PAUSED"
      ? "Resume gate"
      : input.status === "STOPPED"
        ? "Stage gate"
        : "Routing gate";
  const actionPhrase =
    input.status === "PAUSED"
      ? "resume this group"
      : input.status === "STOPPED"
        ? "stage this group again"
        : "route this group again";

  if (input.status === "EMERGENCY_STOPPED" || input.healthStatus === "UNHEALTHY") {
    return {
      label: "Recovery gate",
      detail: "Clear the active runtime blocker before you reuse this copy group.",
      tone: "danger",
    };
  }

  if (!input.masterConnected) {
    return {
      label,
      detail: `Reconnect the master account before you ${actionPhrase}.`,
      tone: "danger",
    };
  }

  if (input.totalFollowerCount === 0) {
    return {
      label,
      detail: "Assign at least one follower account before routing this copy group again.",
      tone: "warn",
    };
  }

  if (disconnectedFollowers > 0) {
    return {
      label,
      detail: `Reconnect ${disconnectedFollowers} follower${disconnectedFollowers === 1 ? "" : "s"} before you ${actionPhrase}.`,
      tone: "warn",
    };
  }

  if (
    input.latestRestartRecoveryMessage &&
    (input.status === "PAUSED" || input.status === "STOPPED")
  ) {
    return {
      label,
      detail: "Review the reload recovery trail, then route the group only when the next session setup looks safe.",
      tone: "warn",
    };
  }

  if (input.healthStatus === "DEGRADED") {
    return {
      label: input.status === "RUNNING" ? "Routing gate" : label,
      detail: "Confirm the degraded signal is stable before the next routing window.",
      tone: "warn",
    };
  }

  if (input.status === "PAUSED") {
    return {
      label,
      detail: "Master and followers look ready. Resume when the next routing window opens.",
      tone: "ok",
    };
  }

  if (input.status === "STOPPED") {
    return {
      label,
      detail: "Master and followers look ready. Stage this group when you are ready to route again.",
      tone: "ok",
    };
  }

  return {
    label: "Routing gate",
    detail: "Keep monitoring the live signal mix before the next routing window.",
    tone: "muted",
  };
}

export function buildCopyGroupHistorySummary(
  activity: CopyGroupActivity[],
  observability?: CopyGroupObservability | null,
  options: {
    now?: string;
  } = {},
): CopyGroupHistorySummary {
  const source =
    observability ??
    ({
      groupId: activity[0]?.groupId ?? "group",
      recentActivity: activity,
      totalEvents: activity.length,
      infoEventCount: activity.filter((entry) => entry.severity === "INFO").length,
      warningEventCount: activity.filter((entry) => entry.severity === "WARN").length,
      errorEventCount: activity.filter((entry) => entry.severity === "ERROR").length,
      restartRecoveryCount: activity.filter(
        (entry) => entry.category === "LIFECYCLE" && isRestartRecoveryMessage(entry.message),
      ).length,
      categoryCounts: {
        lifecycle: activity.filter((entry) => entry.category === "LIFECYCLE").length,
        trade: activity.filter((entry) => entry.category === "TRADE").length,
        rule: activity.filter((entry) => entry.category === "RULE").length,
        intent: activity.filter((entry) => entry.category === "INTENT").length,
        execution: activity.filter((entry) => entry.category === "EXECUTION").length,
        health: activity.filter((entry) => entry.category === "HEALTH").length,
      },
      lifecycleCounts: {
        started: activity.filter((entry) => / started\./i.test(entry.message)).length,
        paused: activity.filter((entry) => / paused\./i.test(entry.message)).length,
        resumed: activity.filter((entry) => / resumed\./i.test(entry.message)).length,
        stopped: activity.filter((entry) => / stopped\./i.test(entry.message)).length,
        emergencyStopped: activity.filter((entry) => /emergency stop/i.test(entry.message)).length,
      },
      lastEventAt: activity[0]?.timestamp,
      lastLifecycleAt: activity.find((entry) => entry.category === "LIFECYCLE")?.timestamp,
      lastLifecycleMessage: activity.find((entry) => entry.category === "LIFECYCLE")?.message,
      lastErrorAt: activity.find((entry) => entry.severity === "ERROR")?.timestamp,
      lastErrorMessage: activity.find((entry) => entry.severity === "ERROR")?.message,
      lastRestartRecoveryAt: activity.find(
        (entry) => entry.category === "LIFECYCLE" && isRestartRecoveryMessage(entry.message),
      )?.timestamp,
      lastRestartRecoveryMessage: activity.find(
        (entry) => entry.category === "LIFECYCLE" && isRestartRecoveryMessage(entry.message),
      )?.message,
    } satisfies CopyGroupObservability);

  const lifecycleParts: string[] = [];
  if (source.lifecycleCounts.started > 0) {
    lifecycleParts.push(`${source.lifecycleCounts.started} start`);
  }
  if (source.lifecycleCounts.paused > 0) {
    lifecycleParts.push(`${source.lifecycleCounts.paused} pause`);
  }
  if (source.lifecycleCounts.resumed > 0) {
    lifecycleParts.push(`${source.lifecycleCounts.resumed} resume`);
  }
  if (source.lifecycleCounts.emergencyStopped > 0) {
    lifecycleParts.push(`${source.lifecycleCounts.emergencyStopped} emergency stop`);
  }
  if (source.lifecycleCounts.stopped > 0) {
    lifecycleParts.push(`${source.lifecycleCounts.stopped} stop`);
  }

  const lifecycleHeadline =
    lifecycleParts.length > 0
      ? `${lifecycleParts.join(" • ")}`
      : source.lastLifecycleMessage ?? "No lifecycle actions captured yet.";
  const lifecycleDetail = source.lastLifecycleMessage
    ? source.lastLifecycleAt
      ? `${source.lastLifecycleMessage} ${formatActivityTimestampLabel(source.lastLifecycleAt)}`
      : source.lastLifecycleMessage
    : "The raw history below still captures line-by-line runtime updates.";

  const severityTone =
    source.errorEventCount > 0
      ? "danger"
      : source.warningEventCount > 0
        ? "warn"
        : source.infoEventCount > 0
          ? "ok"
          : "muted";
  const severityLabel =
    source.errorEventCount > 0
      ? `${source.errorEventCount} error${source.errorEventCount === 1 ? "" : "s"} logged`
      : source.warningEventCount > 0
        ? `${source.warningEventCount} warning${source.warningEventCount === 1 ? "" : "s"} on record`
        : source.totalEvents > 0
          ? `${source.totalEvents} update${source.totalEvents === 1 ? "" : "s"} captured`
          : "No recent updates";
  const nowDate = new Date(options.now ?? new Date().toISOString());
  const signalFreshness =
    source.lastEventAt && !Number.isNaN(nowDate.getTime())
      ? (() => {
          const lastEventDate = new Date(source.lastEventAt);
          if (Number.isNaN(lastEventDate.getTime())) {
            return {
              label: "Signal timing unavailable",
              detail: "The latest runtime event does not include a readable timestamp yet.",
              tone: "muted" as const,
            };
          }

          const ageMinutes = Math.max(
            Math.floor((nowDate.getTime() - lastEventDate.getTime()) / 60_000),
            0,
          );
          const ageLabel = formatElapsedDuration(ageMinutes);
          const timestampLabel = formatActivityTimestampLabel(source.lastEventAt);

          if (ageMinutes <= 15) {
            return {
              label: `Fresh ${ageLabel} ago`,
              detail: `Latest signal logged ${timestampLabel}.`,
              tone: "ok" as const,
            };
          }

          if (ageMinutes <= 60) {
            return {
              label: `Quiet ${ageLabel}`,
              detail: `Latest signal logged ${timestampLabel}. Quiet history can be normal for paused or idle groups.`,
              tone: "muted" as const,
            };
          }

          return {
            label: `Stale ${ageLabel}`,
            detail: `Latest signal logged ${timestampLabel}. Recheck the activity feed if this group should still be active.`,
            tone: "warn" as const,
          };
        })()
      : {
          label: "No signal timestamp",
          detail: "This history window does not yet have a runtime event timestamp to compare.",
          tone: "muted" as const,
        };
  const recoveryPriority =
    source.errorEventCount > 0 || source.lifecycleCounts.emergencyStopped > 0
      ? {
          label: "Review now",
          detail: source.lastErrorMessage
            ? `Most recent blocker: ${source.lastErrorMessage}`
            : "A runtime or lifecycle blocker needs operator review before restart.",
          tone: "danger" as const,
        }
      : source.warningEventCount > 0 || source.lifecycleCounts.paused > 0
        ? {
            label: "Review soon",
            detail: source.lastLifecycleMessage
              ? `Latest runtime change: ${source.lastLifecycleMessage}`
              : "Warnings or paused state should be checked before the next copy session.",
            tone: "warn" as const,
          }
        : source.totalEvents > 0
          ? {
              label: "Stable",
              detail: source.lastLifecycleMessage
                ? `Latest stable signal: ${source.lastLifecycleMessage}`
                : "Recent history only shows informational updates.",
              tone: "ok" as const,
            }
          : {
              label: "No recent signal",
              detail: "The recent history window does not yet have enough runtime activity to rank recovery urgency.",
              tone: "muted" as const,
            };
  const restartSignal =
    source.restartRecoveryCount > 0
      ? {
          label:
            source.restartRecoveryCount === 1
              ? "1 restart recovery captured"
              : `${source.restartRecoveryCount} restart recoveries captured`,
          detail: source.lastRestartRecoveryMessage
            ? source.lastRestartRecoveryAt
              ? `${source.lastRestartRecoveryMessage} ${formatActivityTimestampLabel(source.lastRestartRecoveryAt)}`
              : source.lastRestartRecoveryMessage
            : "A restore or recovery event was captured after reload.",
          tone: "ok" as const,
        }
      : {
          label: "No restart recovery captured",
          detail: "This history window has not yet recorded a restore or recovery event after reload.",
          tone: "muted" as const,
        };

  return {
    lifecycleHeadline,
    lifecycleDetail,
    severityLabel,
    severityTone,
    signalFreshnessLabel: signalFreshness.label,
    signalFreshnessDetail: signalFreshness.detail,
    signalFreshnessTone: signalFreshness.tone,
    recoveryPriorityLabel: recoveryPriority.label,
    recoveryPriorityDetail: recoveryPriority.detail,
    recoveryPriorityTone: recoveryPriority.tone,
    restartSignalLabel: restartSignal.label,
    restartSignalDetail: restartSignal.detail,
    restartSignalTone: restartSignal.tone,
    categoryBadges: [
      {
        label: "Lifecycle",
        value: source.categoryCounts.lifecycle,
        tone: "ok",
      },
      {
        label: "Health",
        value: source.categoryCounts.health,
        tone: source.categoryCounts.health > 0 ? "warn" : "muted",
      },
      {
        label: "Execution",
        value: source.categoryCounts.execution,
        tone: source.categoryCounts.execution > 0 ? "warn" : "muted",
      },
      {
        label: "Rules",
        value: source.categoryCounts.rule,
        tone: source.categoryCounts.rule > 0 ? "warn" : "muted",
      },
      {
        label: "Recovery",
        value: source.restartRecoveryCount,
        tone: source.restartRecoveryCount > 0 ? "ok" : "muted",
      },
    ],
  };
}

export function clusterCopyGroupActivityFeed(
  items: CopyGroupActivityFeedItem[],
): CopyGroupActivityFeedItem[] {
  const clusters: CopyGroupActivityFeedItem[] = [];

  for (const item of items) {
    const previous = clusters[clusters.length - 1];
    const canCluster =
      previous &&
      previous.groupId === item.groupId &&
      previous.intentId &&
      item.intentId &&
      previous.intentId === item.intentId &&
      previous.followerAccountId === item.followerAccountId &&
      previous.type === item.type;

    if (!canCluster) {
      clusters.push({
        ...item,
        relatedCount: 0,
        relatedMessages: [],
      });
      continue;
    }

    previous.relatedCount = (previous.relatedCount ?? 0) + 1;
    previous.relatedMessages = [
      ...(previous.relatedMessages ?? []),
      item.message,
    ].slice(0, 3);
  }

  return clusters;
}

export function filterCopyGroupActivityFeed(
  items: CopyGroupActivityFeedItem[],
  mode: "all" | "alerts",
): CopyGroupActivityFeedItem[] {
  if (mode === "all") {
    return items;
  }

  return items.filter((item) => item.severity !== "INFO" || item.type === "error");
}

export function hydrateCopyGroup(detail: CopyGroupDetailApiRecord): CopyGroup {
  return {
    groupId: detail.group.group.groupId,
    name: detail.group.group.name,
    masterAccountId: detail.group.group.masterAccountId,
    followerAccountIds: detail.group.group.followerAccountIds,
    runtime: detail.runtime?.state ?? {
      groupId: detail.group.group.groupId,
      status: "STOPPED",
      isKillSwitchActive: false,
      masterConnected: false,
      connectedFollowerCount: 0,
      totalFollowerCount: detail.group.group.followerAccountIds.length,
    },
    statistics: detail.runtime?.statistics ?? {
      groupId: detail.group.group.groupId,
      tradesObserved: 0,
      intentsCreated: 0,
      intentsSent: 0,
      intentsAcknowledged: 0,
      intentsFilled: 0,
      intentsRejected: 0,
      intentsCancelled: 0,
      intentsFailed: 0,
      followerOrdersSubmitted: 0,
      followerOrdersSucceeded: 0,
      followerOrdersFailed: 0,
      skippedBlockedSymbolCount: 0,
      skippedDisabledFollowerCount: 0,
      skippedZeroQuantityCount: 0,
      avgDispatchLatencyMs: 0,
      p50DispatchLatencyMs: 0,
      p95DispatchLatencyMs: 0,
      p99DispatchLatencyMs: 0,
      lastUpdatedAt: new Date(0).toISOString(),
    },
    health: detail.runtime?.health ?? {
      groupId: detail.group.group.groupId,
      status: "DEGRADED",
      warnings: [],
      errors: [],
      checkedAt: new Date(0).toISOString(),
    },
  };
}
