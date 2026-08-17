import assert from "node:assert/strict";
import test from "node:test";

import type { InsertTradeHistoryRecordRow, TradeHistoryRecordRow } from "@shared/schema";

import { propCopiaEventBus } from "./event-bus";
import {
  TradeHistoryPersistenceService,
  type TradeHistoryAccountOwnerResolver,
  type TradeHistoryRepository,
} from "./trade-history-persistence";
import { TradeHistoryStore, type TradeHistoryRecord } from "./trade-history-store";

class MemoryRepository implements TradeHistoryRepository {
  rows = new Map<string, TradeHistoryRecordRow>();
  deletedBefore?: Date;

  async upsert(entry: InsertTradeHistoryRecordRow): Promise<void> {
    this.rows.set(entry.historyId, entry as TradeHistoryRecordRow);
  }

  async listByUser(userId: string, limit: number): Promise<TradeHistoryRecordRow[]> {
    return Array.from(this.rows.values())
      .filter((row) => row.userId === userId)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, limit);
  }

  async deleteOlderThan(_userId: string, cutoff: Date): Promise<void> {
    this.deletedBefore = cutoff;
  }
}

const ownerResolver: TradeHistoryAccountOwnerResolver = {
  async resolveOwnerId(accountIds) {
    return accountIds.includes("follower-1") ? "user-1" : undefined;
  },
};

function createRecord(overrides: Partial<TradeHistoryRecord> = {}): TradeHistoryRecord {
  return {
    historyId: "intent-1",
    intentId: "intent-1",
    masterAccountId: "master-1",
    masterFillId: "fill-1",
    followerAccountId: "follower-1",
    symbol: "ES",
    side: "BUY",
    quantity: 2,
    lifecycleStatus: "SENT",
    createdAt: "2026-08-17T12:00:00.000Z",
    updatedAt: "2026-08-17T12:00:01.000Z",
    events: [{
      type: "execution.sent",
      timestamp: "2026-08-17T12:00:01.000Z",
      message: "Execution sent to broker",
    }],
    ...overrides,
  };
}

test("persists live lifecycle changes under the resolved account owner", async () => {
  const repository = new MemoryRepository();
  const service = new TradeHistoryPersistenceService(repository, ownerResolver, {
    processInstanceId: "process-current",
  });
  const store = new TradeHistoryStore();
  service.attach(store);
  store.start();

  propCopiaEventBus.publish("intent.created", {
    intent: {
      intentId: "intent-live",
      masterAccountId: "master-1",
      masterFillId: "fill-live",
      followerAccountId: "follower-1",
      symbol: "ES",
      side: "BUY",
      quantity: 1,
      createdAt: "2026-08-17T12:00:00.000Z",
      status: "NEW",
    },
  });
  await service.flush();

  const row = repository.rows.get("intent-live");
  assert.ok(row);
  assert.equal(row.userId, "user-1");
  assert.equal(row.lifecycleStatus, "INTENT_CREATED");
  assert.equal(row.processInstanceId, "process-current");
  store.stop();
});

test("restart hydration flags unfinished records and never emits a replay event", async () => {
  const repository = new MemoryRepository();
  const persisted = createRecord();
  repository.rows.set(persisted.historyId, {
    historyId: persisted.historyId,
    userId: "user-1",
    masterAccountId: persisted.masterAccountId ?? null,
    followerAccountId: persisted.followerAccountId,
    lifecycleStatus: persisted.lifecycleStatus,
    recordJson: JSON.stringify(persisted),
    processInstanceId: "process-old",
    createdAt: new Date(persisted.createdAt),
    updatedAt: new Date(persisted.updatedAt),
  });
  const service = new TradeHistoryPersistenceService(repository, ownerResolver, {
    processInstanceId: "process-new",
  });
  const store = new TradeHistoryStore();
  let changedRecords = 0;
  store.setRecordListener(() => changedRecords += 1);

  const records = await service.hydrateUser("user-1", store);

  assert.equal(records.length, 1);
  assert.equal(records[0].recoveryRequired, true);
  assert.match(records[0].events[0].message, /not resubmitted/i);
  assert.equal(store.get(persisted.historyId)?.recoveryRequired, true);
  assert.equal(changedRecords, 0);
  assert.equal(repository.rows.get(persisted.historyId)?.processInstanceId, "process-new");
});

test("terminal records hydrate without restart recovery flags", async () => {
  const repository = new MemoryRepository();
  const persisted = createRecord({ lifecycleStatus: "FILLED", filledAt: "2026-08-17T12:00:02.000Z" });
  repository.rows.set(persisted.historyId, {
    historyId: persisted.historyId,
    userId: "user-1",
    masterAccountId: persisted.masterAccountId ?? null,
    followerAccountId: persisted.followerAccountId,
    lifecycleStatus: persisted.lifecycleStatus,
    recordJson: JSON.stringify(persisted),
    processInstanceId: "process-old",
    createdAt: new Date(persisted.createdAt),
    updatedAt: new Date(persisted.updatedAt),
  });
  const service = new TradeHistoryPersistenceService(repository, ownerResolver, {
    processInstanceId: "process-new",
  });

  const records = await service.hydrateUser("user-1", new TradeHistoryStore());
  assert.equal(records[0].recoveryRequired, undefined);
  assert.equal(repository.rows.get(persisted.historyId)?.processInstanceId, "process-old");
});
