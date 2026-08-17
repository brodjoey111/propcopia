import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, lt } from "drizzle-orm";

import {
  accounts,
  tradeHistoryRecords,
  type InsertTradeHistoryRecordRow,
  type TradeHistoryRecordRow,
} from "@shared/schema";

import { db } from "./db";
import type { TradeHistoryLifecycleStatus, TradeHistoryRecord, TradeHistoryStore } from "./trade-history-store";

const NONTERMINAL_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "INTENT_CREATED",
  "QUEUED",
  "SENT",
  "ACKNOWLEDGED",
  "PARTIALLY_FILLED",
]);

export interface TradeHistoryRepository {
  upsert(entry: InsertTradeHistoryRecordRow): Promise<void>;
  listByUser(userId: string, limit: number): Promise<TradeHistoryRecordRow[]>;
  deleteOlderThan(userId: string, cutoff: Date): Promise<void>;
}

export interface TradeHistoryAccountOwnerResolver {
  resolveOwnerId(accountIds: string[]): Promise<string | undefined>;
}

class DbTradeHistoryRepository implements TradeHistoryRepository {
  async upsert(entry: InsertTradeHistoryRecordRow): Promise<void> {
    await db.insert(tradeHistoryRecords).values(entry).onConflictDoUpdate({
      target: tradeHistoryRecords.historyId,
      set: {
        userId: entry.userId,
        masterAccountId: entry.masterAccountId ?? null,
        followerAccountId: entry.followerAccountId,
        lifecycleStatus: entry.lifecycleStatus,
        recordJson: entry.recordJson,
        processInstanceId: entry.processInstanceId,
        updatedAt: entry.updatedAt,
      },
    });
  }

  async listByUser(userId: string, limit: number): Promise<TradeHistoryRecordRow[]> {
    return db
      .select()
      .from(tradeHistoryRecords)
      .where(eq(tradeHistoryRecords.userId, userId))
      .orderBy(desc(tradeHistoryRecords.updatedAt))
      .limit(limit);
  }

  async deleteOlderThan(userId: string, cutoff: Date): Promise<void> {
    await db.delete(tradeHistoryRecords).where(and(
      eq(tradeHistoryRecords.userId, userId),
      lt(tradeHistoryRecords.updatedAt, cutoff),
    ));
  }
}

class DbTradeHistoryAccountOwnerResolver implements TradeHistoryAccountOwnerResolver {
  async resolveOwnerId(accountIds: string[]): Promise<string | undefined> {
    const uniqueIds = Array.from(new Set(accountIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return undefined;
    }

    const rows = await db
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(inArray(accounts.id, uniqueIds));
    const ownerIds = Array.from(new Set(rows.map((row) => row.userId)));
    return ownerIds.length === 1 ? ownerIds[0] : undefined;
  }
}

export interface TradeHistoryPersistenceOptions {
  processInstanceId?: string;
  retentionDays?: number;
  maxHydratedRecords?: number;
  onError?: (error: unknown) => void;
}

export class TradeHistoryPersistenceService {
  private readonly processInstanceId: string;
  private readonly retentionDays: number;
  private readonly maxHydratedRecords: number;
  private readonly onError: (error: unknown) => void;
  private saveQueue = Promise.resolve();

  constructor(
    private readonly repository: TradeHistoryRepository = new DbTradeHistoryRepository(),
    private readonly ownerResolver: TradeHistoryAccountOwnerResolver = new DbTradeHistoryAccountOwnerResolver(),
    options: TradeHistoryPersistenceOptions = {},
  ) {
    this.processInstanceId = options.processInstanceId ?? randomUUID();
    this.retentionDays = options.retentionDays ?? 90;
    this.maxHydratedRecords = options.maxHydratedRecords ?? 2_000;
    this.onError = options.onError ?? ((error) => console.error("Trade history persistence failed:", error));
  }

  attach(store: TradeHistoryStore): void {
    store.setRecordListener((record) => {
      this.saveQueue = this.saveQueue.then(() => this.persist(record)).catch(this.onError);
    });
  }

  async flush(): Promise<void> {
    await this.saveQueue;
  }

  async hydrateUser(userId: string, store: TradeHistoryStore): Promise<TradeHistoryRecord[]> {
    const rows = await this.repository.listByUser(userId, this.maxHydratedRecords);
    const records: TradeHistoryRecord[] = [];

    for (const row of rows) {
      const parsed = deserializeRecord(row.recordJson);
      if (!parsed) {
        this.onError(new Error(`Invalid persisted trade history record: ${row.historyId}`));
        continue;
      }

      if (row.processInstanceId !== this.processInstanceId && NONTERMINAL_STATUSES.has(parsed.lifecycleStatus)) {
        const recoveredAt = new Date().toISOString();
        parsed.recoveryRequired = true;
        parsed.recoveryReason = "Server restarted before the broker lifecycle reached a terminal state";
        parsed.updatedAt = recoveredAt;
        parsed.events = [{
          type: "recovery.required",
          timestamp: recoveredAt,
          message: "Restart recovery review required; order was not resubmitted",
        }, ...parsed.events].slice(0, 25);
        await this.persistForUser(userId, parsed);
      }

      records.push(parsed);
    }

    store.importRecords(records);
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1_000);
    await this.repository.deleteOlderThan(userId, cutoff);
    return records;
  }

  private async persist(record: TradeHistoryRecord): Promise<void> {
    const ownerId = await this.ownerResolver.resolveOwnerId([
      record.followerAccountId,
      ...(record.masterAccountId ? [record.masterAccountId] : []),
    ]);
    if (!ownerId) {
      throw new Error(`Unable to resolve one owner for trade history ${record.historyId}`);
    }
    await this.persistForUser(ownerId, record);
  }

  private async persistForUser(userId: string, record: TradeHistoryRecord): Promise<void> {
    await this.repository.upsert({
      historyId: record.historyId,
      userId,
      masterAccountId: record.masterAccountId ?? null,
      followerAccountId: record.followerAccountId,
      lifecycleStatus: record.lifecycleStatus,
      recordJson: JSON.stringify(record),
      processInstanceId: this.processInstanceId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }
}

function deserializeRecord(value: string): TradeHistoryRecord | undefined {
  try {
    const parsed = JSON.parse(value) as TradeHistoryRecord;
    if (!parsed || typeof parsed !== "object" || !parsed.historyId || !Array.isArray(parsed.events)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export const tradeHistoryPersistence = new TradeHistoryPersistenceService();
