import assert from "node:assert/strict";
import test from "node:test";

import {
  CopyGroupActivityStore,
  mergeCopyGroupActivity,
  type CopyGroupActivityStoreRepository,
} from "./copy-group-activity-store";
import type { CopyGroupActivityEvent } from "@shared/schema";
import type { CopyGroupActivity } from "./copy-group-types";

class InMemoryCopyGroupActivityStoreRepository implements CopyGroupActivityStoreRepository {
  readonly events: CopyGroupActivityEvent[] = [];

  async insertEvent(event: CopyGroupActivityEvent): Promise<void> {
    if (this.events.some((existing) => existing.eventId === event.eventId)) {
      return;
    }

    this.events.push(event);
  }

  async listEvents(userId: string, groupIds: string[]): Promise<CopyGroupActivityEvent[]> {
    return this.events
      .filter((event) => event.userId === userId && groupIds.includes(event.groupId))
      .sort((left, right) => right.timestamp.toISOString().localeCompare(left.timestamp.toISOString()));
  }
}

function createActivity(eventId: string, overrides: Partial<CopyGroupActivity> = {}): CopyGroupActivity {
  return {
    eventId,
    groupId: overrides.groupId ?? "group-1",
    timestamp: overrides.timestamp ?? "2026-08-11T12:00:00.000Z",
    severity: overrides.severity ?? "INFO",
    category: overrides.category ?? "LIFECYCLE",
    message: overrides.message ?? "Registered group.",
    intentId: overrides.intentId,
    followerAccountId: overrides.followerAccountId,
    details: overrides.details,
  };
}

test("CopyGroupActivityStore records and groups durable activity by copy group", async () => {
  const repository = new InMemoryCopyGroupActivityStoreRepository();
  const store = new CopyGroupActivityStore(repository);

  await store.recordActivity({
    userId: "user-1",
    groupId: "group-1",
    activity: createActivity("event-1", {
      details: { followerCount: 2, restored: true },
    }),
  });
  await store.recordActivity({
    userId: "user-1",
    groupId: "group-2",
    activity: createActivity("event-2", {
      groupId: "group-2",
      timestamp: "2026-08-11T12:05:00.000Z",
      severity: "WARN",
      message: "Follower reconnecting.",
    }),
  });
  await store.recordActivity({
    userId: "user-1",
    groupId: "group-1",
    activity: createActivity("event-1"),
  });

  const grouped = await store.listRecentActivity("user-1", ["group-1", "group-2"]);

  assert.equal(repository.events.length, 2);
  assert.equal(grouped["group-1"]?.length, 1);
  assert.deepEqual(grouped["group-1"]?.[0]?.details, { followerCount: 2, restored: true });
  assert.equal(grouped["group-2"]?.[0]?.message, "Follower reconnecting.");
});

test("mergeCopyGroupActivity deduplicates runtime and persisted history and keeps newest first", () => {
  const merged = mergeCopyGroupActivity(
    [
      createActivity("event-1", { timestamp: "2026-08-11T11:59:00.000Z", message: "Persisted registration." }),
      createActivity("event-2", { timestamp: "2026-08-11T12:01:00.000Z", severity: "WARN", message: "Persisted warning." }),
    ],
    [
      createActivity("event-2", { timestamp: "2026-08-11T12:01:00.000Z", severity: "WARN", message: "Runtime warning." }),
      createActivity("event-3", { timestamp: "2026-08-11T12:02:00.000Z", severity: "ERROR", message: "Runtime error." }),
    ],
    5,
  );

  assert.deepEqual(
    merged.map((entry) => ({ eventId: entry.eventId, message: entry.message })),
    [
      { eventId: "event-3", message: "Runtime error." },
      { eventId: "event-2", message: "Persisted warning." },
      { eventId: "event-1", message: "Persisted registration." },
    ],
  );
});
