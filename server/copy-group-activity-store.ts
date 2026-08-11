import { and, desc, eq, inArray } from "drizzle-orm";

import {
  copyGroupActivityEvents,
  type CopyGroupActivityEvent,
  type InsertCopyGroupActivityEvent,
} from "@shared/schema";

import { db } from "./db";
import type { CopyGroupActivity } from "./copy-group-types";

export interface PersistCopyGroupActivityInput {
  userId: string;
  groupId: string;
  activity: CopyGroupActivity;
}

export interface CopyGroupActivityStoreRepository {
  insertEvent(event: InsertCopyGroupActivityEvent): Promise<void>;
  listEvents(userId: string, groupIds: string[]): Promise<CopyGroupActivityEvent[]>;
}

class DbCopyGroupActivityStoreRepository implements CopyGroupActivityStoreRepository {
  async insertEvent(event: InsertCopyGroupActivityEvent): Promise<void> {
    await db
      .insert(copyGroupActivityEvents)
      .values(event)
      .onConflictDoNothing();
  }

  async listEvents(userId: string, groupIds: string[]): Promise<CopyGroupActivityEvent[]> {
    if (groupIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(copyGroupActivityEvents)
      .where(
        and(
          eq(copyGroupActivityEvents.userId, userId),
          inArray(copyGroupActivityEvents.groupId, groupIds),
        ),
      )
      .orderBy(desc(copyGroupActivityEvents.timestamp));
  }
}

function serializeDetails(
  details?: Record<string, string | number | boolean | null>,
): string | null {
  if (!details) {
    return null;
  }

  return JSON.stringify(details);
}

function deserializeDetails(
  detailsJson: string | null,
): Record<string, string | number | boolean | null> | undefined {
  if (!detailsJson) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(detailsJson) as Record<string, string | number | boolean | null>;
    return parsed;
  } catch {
    return undefined;
  }
}

function toActivity(event: CopyGroupActivityEvent): CopyGroupActivity {
  return {
    eventId: event.eventId,
    groupId: event.groupId,
    timestamp: event.timestamp.toISOString(),
    severity: event.severity as CopyGroupActivity["severity"],
    category: event.category as CopyGroupActivity["category"],
    message: event.message,
    intentId: event.intentId ?? undefined,
    followerAccountId: event.followerAccountId ?? undefined,
    details: deserializeDetails(event.detailsJson ?? null),
  };
}

export function mergeCopyGroupActivity(
  persistedActivity: CopyGroupActivity[],
  runtimeActivity: CopyGroupActivity[],
  limit = 50,
): CopyGroupActivity[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
  const merged = new Map<string, CopyGroupActivity>();

  for (const entry of [...runtimeActivity, ...persistedActivity]) {
    merged.set(entry.eventId, entry);
  }

  return Array.from(merged.values())
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, safeLimit);
}

export class CopyGroupActivityStore {
  constructor(
    private readonly repository: CopyGroupActivityStoreRepository = new DbCopyGroupActivityStoreRepository(),
  ) {}

  async recordActivity(input: PersistCopyGroupActivityInput): Promise<void> {
    await this.repository.insertEvent({
      eventId: input.activity.eventId,
      userId: input.userId,
      groupId: input.groupId,
      timestamp: new Date(input.activity.timestamp),
      severity: input.activity.severity,
      category: input.activity.category,
      message: input.activity.message,
      intentId: input.activity.intentId ?? null,
      followerAccountId: input.activity.followerAccountId ?? null,
      detailsJson: serializeDetails(input.activity.details),
    });
  }

  async listRecentActivity(
    userId: string,
    groupIds: string[],
    limitPerGroup = 50,
  ): Promise<Record<string, CopyGroupActivity[]>> {
    const safeLimit = Number.isFinite(limitPerGroup)
      ? Math.max(1, Math.floor(limitPerGroup))
      : 50;
    const events = await this.repository.listEvents(userId, groupIds);
    const grouped: Record<string, CopyGroupActivity[]> = {};

    for (const groupId of groupIds) {
      grouped[groupId] = [];
    }

    for (const event of events) {
      const target = grouped[event.groupId] ?? (grouped[event.groupId] = []);
      if (target.length >= safeLimit) {
        continue;
      }

      target.push(toActivity(event));
    }

    return grouped;
  }
}

export const copyGroupActivityStore = new CopyGroupActivityStore();
