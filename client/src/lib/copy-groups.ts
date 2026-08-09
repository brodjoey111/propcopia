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
  activity: CopyGroupActivity[];
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
      })),
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
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
