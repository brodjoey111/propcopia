import { propCopiaEventBus } from './event-bus';
import type { EventHandler } from './event-bus';
import type { PropCopiaEventMap } from './event-bus-types';
import {
  buildCopyGroupAlertFromActivity,
  buildCopyGroupAlertFromHealthChange,
  type CopyGroupAlertRecord,
} from './copy-group-alerts';

export interface CopyGroupAlertStoreFilter {
  userId: string;
  groupIds?: string[];
  limit?: number;
}

export class CopyGroupAlertStore {
  private readonly alertsByUserId = new Map<string, CopyGroupAlertRecord[]>();
  private readonly subscriptions: Array<() => void> = [];
  private started = false;

  constructor(private readonly maxAlertsPerUser = 250) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.subscribe('copy_group.activity_recorded', (event) => {
      const record = buildCopyGroupAlertFromActivity({
        group: event.group,
        activity: event.activity,
        observability: event.observability,
      });

      if (record) {
        this.append(record);
      }
    });

    this.subscribe('copy_group.health_changed', (event) => {
      this.append(buildCopyGroupAlertFromHealthChange({
        group: event.group,
        previousStatus: event.previousStatus,
        health: event.health,
      }));
    });

    this.started = true;
  }

  stop(): void {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions.length = 0;
    this.started = false;
  }

  clear(): void {
    this.alertsByUserId.clear();
  }

  listRecent(filter: CopyGroupAlertStoreFilter): CopyGroupAlertRecord[] {
    const limit = filter.limit ?? 50;
    const groupIds = filter.groupIds ? new Set(filter.groupIds) : null;

    return (this.alertsByUserId.get(filter.userId) ?? [])
      .filter((record) => (groupIds ? groupIds.has(record.groupId) : true))
      .slice(0, limit);
  }

  listActiveStories(filter: CopyGroupAlertStoreFilter): CopyGroupAlertRecord[] {
    const limit = filter.limit ?? 50;
    const recent = this.listRecent({
      userId: filter.userId,
      groupIds: filter.groupIds,
      limit: this.maxAlertsPerUser,
    });
    const processedGroupIds = new Set<string>();
    const stories: CopyGroupAlertRecord[] = [];

    for (const record of recent) {
      if (processedGroupIds.has(record.groupId)) {
        continue;
      }

      processedGroupIds.add(record.groupId);

      if (record.severity === 'info' && record.healthStatus === 'HEALTHY') {
        continue;
      }

      if (record.severity !== 'info') {
        stories.push(record);
      }

      if (stories.length >= limit) {
        break;
      }
    }

    return stories;
  }

  private append(record: CopyGroupAlertRecord): void {
    const current = this.alertsByUserId.get(record.userId) ?? [];
    this.alertsByUserId.set(record.userId, [record, ...current].slice(0, this.maxAlertsPerUser));
  }

  private subscribe<K extends keyof PropCopiaEventMap>(
    eventName: K,
    handler: EventHandler<PropCopiaEventMap[K]>,
  ): void {
    propCopiaEventBus.subscribe(eventName, handler);
    this.subscriptions.push(() => propCopiaEventBus.unsubscribe(eventName, handler));
  }
}

export const copyGroupAlertStore = new CopyGroupAlertStore();
copyGroupAlertStore.start();
