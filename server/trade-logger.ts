import { db } from './db';
import { trades, type InsertTrade } from '@shared/schema';
import { sanitizeOperationalValue } from './operational-logger';

type TradeLogWriter = (entries: InsertTrade[]) => Promise<void>;
type TradeLogScheduler = (
  callback: () => void,
  intervalMs: number,
) => NodeJS.Timeout;
type TradeLogClearScheduler = (handle: NodeJS.Timeout) => void;

export interface TradeLoggerStats {
  pendingCount: number;
  maxPendingCount: number;
  totalQueued: number;
  totalFlushed: number;
  totalFlushes: number;
  totalFailedFlushes: number;
  lastSuccessfulBatchSize?: number;
  lastFlushDurationMs?: number;
  lastFlushedAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  isFlushing: boolean;
}

export interface TradeLoggerOptions {
  batchSize?: number;
  flushIntervalMs?: number;
  autoStart?: boolean;
  writer?: TradeLogWriter;
  scheduler?: TradeLogScheduler;
  clearScheduler?: TradeLogClearScheduler;
  logger?: Pick<Console, 'log' | 'error'>;
}

// Batched async trade logger to prevent blocking
export class TradeLogger {
  private pendingTrades: InsertTrade[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private flushPromise: Promise<void> | null = null;
  private followUpFlushRequested = false;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly writer: TradeLogWriter;
  private readonly scheduler: TradeLogScheduler;
  private readonly clearScheduler: TradeLogClearScheduler;
  private readonly logger: Pick<Console, 'log' | 'error'>;
  private stats: TradeLoggerStats = {
    pendingCount: 0,
    maxPendingCount: 0,
    totalQueued: 0,
    totalFlushed: 0,
    totalFlushes: 0,
    totalFailedFlushes: 0,
    isFlushing: false,
  };

  constructor(options: TradeLoggerOptions = {}) {
    this.batchSize = options.batchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 1000;
    this.writer =
      options.writer ??
      (async (entries) => {
        await db.insert(trades).values(entries);
      });
    this.scheduler = options.scheduler ?? setInterval;
    this.clearScheduler = options.clearScheduler ?? clearInterval;
    this.logger = options.logger ?? console;

    if (options.autoStart !== false) {
      this.start();
    }
  }

  start(): void {
    if (this.batchInterval) {
      return;
    }

    this.batchInterval = this.scheduler(() => {
      this.flushWithLogging();
    }, this.flushIntervalMs);
    this.batchInterval.unref?.();
  }

  // Queue a trade for async logging (non-blocking)
  async logTrade(trade: Omit<InsertTrade, 'id' | 'timestamp'>): Promise<void> {
    this.pendingTrades.push(trade as InsertTrade);
    this.syncPendingStats();
    this.stats.totalQueued += 1;

    // Flush immediately if batch size reached
    if (this.pendingTrades.length >= this.batchSize) {
      this.requestFollowUpFlush();
    }
  }

  getStats(): TradeLoggerStats {
    return {
      ...this.stats,
      pendingCount: this.pendingTrades.length,
      isFlushing: this.flushPromise !== null,
    };
  }

  // Flush pending trades to database
  async flush(): Promise<void> {
    if (this.flushPromise) {
      this.followUpFlushRequested =
        this.followUpFlushRequested || this.pendingTrades.length >= this.batchSize;
      return this.flushPromise;
    }

    if (this.pendingTrades.length === 0) {
      return;
    }

    this.stats.isFlushing = true;
    this.flushPromise = this.flushBatch();

    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
      this.stats.isFlushing = false;

      if (this.followUpFlushRequested || this.pendingTrades.length >= this.batchSize) {
        this.followUpFlushRequested = false;
        this.requestFollowUpFlush();
      }
    }
  }

  // Force flush all pending trades
  async shutdown(): Promise<void> {
    if (this.batchInterval) {
      this.clearScheduler(this.batchInterval);
      this.batchInterval = null;
    }

    while (this.pendingTrades.length > 0) {
      await this.flush();
    }
  }

  private syncPendingStats(): void {
    this.stats.pendingCount = this.pendingTrades.length;
    this.stats.maxPendingCount = Math.max(
      this.stats.maxPendingCount,
      this.pendingTrades.length,
    );
  }

  private requestFollowUpFlush(): void {
    this.followUpFlushRequested = true;
    setImmediate(() => {
      if (!this.followUpFlushRequested) {
        return;
      }

      this.followUpFlushRequested = false;
      this.flushWithLogging();
    });
  }

  private async flushWithLogging(): Promise<void> {
    try {
      await this.flush();
    } catch (err) {
      this.logger.error('[TradeLogger] Batch flush error:', sanitizeOperationalValue(err));
    }
  }

  private async flushBatch(): Promise<void> {
    const tradesToWrite = this.pendingTrades.splice(0, this.batchSize);
    this.syncPendingStats();
    const startedAtMs = Date.now();

    try {
      await this.writer(tradesToWrite);
      this.stats.totalFlushed += tradesToWrite.length;
      this.stats.totalFlushes += 1;
      this.stats.lastSuccessfulBatchSize = tradesToWrite.length;
      this.stats.lastFlushDurationMs = Date.now() - startedAtMs;
      this.stats.lastFlushedAt = new Date().toISOString();
      this.logger.log(`[TradeLogger] Flushed ${tradesToWrite.length} trades to DB`);
    } catch (error) {
      this.logger.error('[TradeLogger] Failed to write trades:', sanitizeOperationalValue(error));
      // Re-queue failed trades
      this.pendingTrades.unshift(...tradesToWrite);
      this.syncPendingStats();
      this.stats.totalFailedFlushes += 1;
      this.stats.lastErrorAt = new Date().toISOString();
      this.stats.lastErrorMessage = error instanceof Error ? error.message : String(error);
    }
  }
}

// Singleton instance
export const tradeLogger = new TradeLogger();
