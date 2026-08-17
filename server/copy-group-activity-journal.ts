import type { CopyGroupActivity, CopyGroupObservability } from './copy-group-types';

export function createEmptyObservability(groupId: string): CopyGroupObservability {
  return {
    groupId,
    recentActivity: [],
    totalEvents: 0,
    infoEventCount: 0,
    warningEventCount: 0,
    errorEventCount: 0,
    restartRecoveryCount: 0,
    categoryCounts: {
      lifecycle: 0,
      trade: 0,
      rule: 0,
      intent: 0,
      execution: 0,
      health: 0,
    },
    lifecycleCounts: {
      started: 0,
      paused: 0,
      resumed: 0,
      stopped: 0,
      emergencyStopped: 0,
    },
  };
}

function toCategoryKey(activity: CopyGroupActivity): keyof CopyGroupObservability["categoryCounts"] {
  switch (activity.category) {
    case "LIFECYCLE":
      return "lifecycle";
    case "TRADE":
      return "trade";
    case "RULE":
      return "rule";
    case "INTENT":
      return "intent";
    case "EXECUTION":
      return "execution";
    case "HEALTH":
      return "health";
  }
}

function getLifecycleCounter(
  activity: CopyGroupActivity,
): keyof CopyGroupObservability["lifecycleCounts"] | undefined {
  if (activity.category !== "LIFECYCLE") {
    return undefined;
  }

  const normalized = activity.message.toLowerCase();
  if (normalized.includes("emergency stop")) {
    return "emergencyStopped";
  }
  if (normalized.includes(" paused")) {
    return "paused";
  }
  if (normalized.includes(" resumed")) {
    return "resumed";
  }
  if (normalized.includes(" started")) {
    return "started";
  }
  if (normalized.includes(" stopped")) {
    return "stopped";
  }

  return undefined;
}

function isRestartRecoveryActivity(activity: CopyGroupActivity): boolean {
  return (
    activity.category === "LIFECYCLE" &&
    (
      activity.message.startsWith("Recovered copy group ") ||
      activity.message.startsWith("Restored paused copy group ")
    )
  );
}

function compareIsoTimestamps(left?: string, right?: string): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return -1;
  }
  if (!right) {
    return 1;
  }

  return left.localeCompare(right);
}

export function buildCopyGroupObservability(
  groupId: string,
  activity: CopyGroupActivity[],
  seed?: CopyGroupObservability | null,
): CopyGroupObservability {
  const sortedActivity = [...activity].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const summary = createEmptyObservability(groupId);

  for (const entry of sortedActivity) {
    summary.totalEvents += 1;
    summary.categoryCounts[toCategoryKey(entry)] += 1;

    if (entry.severity === "INFO") {
      summary.infoEventCount += 1;
    } else if (entry.severity === "WARN") {
      summary.warningEventCount += 1;
    } else {
      summary.errorEventCount += 1;
    }

    if (!summary.lastEventAt || compareIsoTimestamps(entry.timestamp, summary.lastEventAt) > 0) {
      summary.lastEventAt = entry.timestamp;
    }

    if (
      entry.category === "LIFECYCLE" &&
      (!summary.lastLifecycleAt || compareIsoTimestamps(entry.timestamp, summary.lastLifecycleAt) > 0)
    ) {
      summary.lastLifecycleAt = entry.timestamp;
      summary.lastLifecycleMessage = entry.message;
    }

    if (
      entry.severity === "ERROR" &&
      (!summary.lastErrorAt || compareIsoTimestamps(entry.timestamp, summary.lastErrorAt) > 0)
    ) {
      summary.lastErrorAt = entry.timestamp;
      summary.lastErrorMessage = entry.message;
    }

    if (isRestartRecoveryActivity(entry)) {
      summary.restartRecoveryCount += 1;
      if (
        !summary.lastRestartRecoveryAt ||
        compareIsoTimestamps(entry.timestamp, summary.lastRestartRecoveryAt) > 0
      ) {
        summary.lastRestartRecoveryAt = entry.timestamp;
        summary.lastRestartRecoveryMessage = entry.message;
      }
    }

    const lifecycleCounter = getLifecycleCounter(entry);
    if (lifecycleCounter) {
      summary.lifecycleCounts[lifecycleCounter] += 1;
    }
  }

  summary.recentActivity = sortedActivity;

  if (!seed) {
    return summary;
  }

  const useSummaryLifecycle = compareIsoTimestamps(summary.lastLifecycleAt, seed.lastLifecycleAt) >= 0;
  const useSummaryError = compareIsoTimestamps(summary.lastErrorAt, seed.lastErrorAt) >= 0;
  const useSummaryRestartRecovery =
    compareIsoTimestamps(summary.lastRestartRecoveryAt, seed.lastRestartRecoveryAt) >= 0;

  return {
    ...summary,
    totalEvents: Math.max(summary.totalEvents, seed.totalEvents),
    infoEventCount: Math.max(summary.infoEventCount, seed.infoEventCount),
    warningEventCount: Math.max(summary.warningEventCount, seed.warningEventCount),
    errorEventCount: Math.max(summary.errorEventCount, seed.errorEventCount),
    restartRecoveryCount: Math.max(summary.restartRecoveryCount, seed.restartRecoveryCount),
    categoryCounts: {
      lifecycle: Math.max(summary.categoryCounts.lifecycle, seed.categoryCounts.lifecycle),
      trade: Math.max(summary.categoryCounts.trade, seed.categoryCounts.trade),
      rule: Math.max(summary.categoryCounts.rule, seed.categoryCounts.rule),
      intent: Math.max(summary.categoryCounts.intent, seed.categoryCounts.intent),
      execution: Math.max(summary.categoryCounts.execution, seed.categoryCounts.execution),
      health: Math.max(summary.categoryCounts.health, seed.categoryCounts.health),
    },
    lifecycleCounts: {
      started: Math.max(summary.lifecycleCounts.started, seed.lifecycleCounts.started),
      paused: Math.max(summary.lifecycleCounts.paused, seed.lifecycleCounts.paused),
      resumed: Math.max(summary.lifecycleCounts.resumed, seed.lifecycleCounts.resumed),
      stopped: Math.max(summary.lifecycleCounts.stopped, seed.lifecycleCounts.stopped),
      emergencyStopped: Math.max(
        summary.lifecycleCounts.emergencyStopped,
        seed.lifecycleCounts.emergencyStopped,
      ),
    },
    lastEventAt:
      compareIsoTimestamps(summary.lastEventAt, seed.lastEventAt) >= 0
        ? summary.lastEventAt
        : seed.lastEventAt,
    lastLifecycleAt: useSummaryLifecycle ? summary.lastLifecycleAt : seed.lastLifecycleAt,
    lastLifecycleMessage: useSummaryLifecycle
      ? summary.lastLifecycleMessage
      : seed.lastLifecycleMessage,
    lastErrorAt: useSummaryError ? summary.lastErrorAt : seed.lastErrorAt,
    lastErrorMessage: useSummaryError ? summary.lastErrorMessage : seed.lastErrorMessage,
    lastRestartRecoveryAt: useSummaryRestartRecovery
      ? summary.lastRestartRecoveryAt
      : seed.lastRestartRecoveryAt,
    lastRestartRecoveryMessage: useSummaryRestartRecovery
      ? summary.lastRestartRecoveryMessage
      : seed.lastRestartRecoveryMessage,
  };
}

export class CopyGroupActivityJournal {
  private readonly maxRecentActivity: number;
  private readonly recentActivityByGroupId = new Map<string, CopyGroupActivity[]>();
  private readonly observabilityByGroupId = new Map<string, CopyGroupObservability>();

  constructor(maxRecentActivity = 50) {
    this.maxRecentActivity = Math.max(1, Math.floor(maxRecentActivity));
  }

  append(groupId: string, activity: CopyGroupActivity): CopyGroupObservability {
    const recentActivity = [
      activity,
      ...(this.recentActivityByGroupId.get(groupId) ?? []),
    ].slice(0, this.maxRecentActivity);
    this.recentActivityByGroupId.set(groupId, recentActivity);

    const previous = this.getObservability(groupId);
    const next: CopyGroupObservability = {
      ...previous,
      recentActivity: [...recentActivity],
      totalEvents: previous.totalEvents + 1,
      lastEventAt: activity.timestamp,
      categoryCounts: {
        ...previous.categoryCounts,
      },
      lifecycleCounts: {
        ...previous.lifecycleCounts,
      },
    };

    next.categoryCounts[toCategoryKey(activity)] += 1;

    if (activity.severity === 'INFO') {
      next.infoEventCount += 1;
    } else if (activity.severity === 'WARN') {
      next.warningEventCount += 1;
    } else {
      next.errorEventCount += 1;
      next.lastErrorAt = activity.timestamp;
      next.lastErrorMessage = activity.message;
    }

    if (activity.category === "LIFECYCLE") {
      next.lastLifecycleAt = activity.timestamp;
      next.lastLifecycleMessage = activity.message;
      const lifecycleCounter = getLifecycleCounter(activity);
      if (lifecycleCounter) {
        next.lifecycleCounts[lifecycleCounter] += 1;
      }
    }

    if (isRestartRecoveryActivity(activity)) {
      next.restartRecoveryCount += 1;
      next.lastRestartRecoveryAt = activity.timestamp;
      next.lastRestartRecoveryMessage = activity.message;
    }

    this.observabilityByGroupId.set(groupId, next);
    return {
      ...next,
      recentActivity: [...next.recentActivity],
    };
  }

  getRecentActivity(groupId: string): CopyGroupActivity[] {
    return [...(this.recentActivityByGroupId.get(groupId) ?? [])];
  }

  getObservability(groupId: string): CopyGroupObservability {
    const existing = this.observabilityByGroupId.get(groupId);
    if (!existing) {
      return createEmptyObservability(groupId);
    }

    return {
      ...existing,
      recentActivity: [...existing.recentActivity],
    };
  }

  clear(groupId: string): void {
    this.recentActivityByGroupId.delete(groupId);
    this.observabilityByGroupId.delete(groupId);
  }
}
