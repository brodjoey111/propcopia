import type { CopyGroupActivity, CopyGroupObservability } from './copy-group-types';

function createEmptyObservability(groupId: string): CopyGroupObservability {
  return {
    groupId,
    recentActivity: [],
    totalEvents: 0,
    infoEventCount: 0,
    warningEventCount: 0,
    errorEventCount: 0,
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
    };

    if (activity.severity === 'INFO') {
      next.infoEventCount += 1;
    } else if (activity.severity === 'WARN') {
      next.warningEventCount += 1;
    } else {
      next.errorEventCount += 1;
      next.lastErrorAt = activity.timestamp;
      next.lastErrorMessage = activity.message;
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
