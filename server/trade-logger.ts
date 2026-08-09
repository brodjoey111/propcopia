import { db } from './db';
import { trades, type InsertTrade } from '@shared/schema';

type TradeLogWriter = (entries: InsertTrade[]) => Promise<void>;
type TradeLogScheduler = (
  callback: () => void,
  intervalMs: number,
) => NodeJS.Timeout;
type TradeLogClearScheduler = (handle: NodeJS.Timeout) => void;

export interface TradeLoggerStats {
  pendingCount: number;
  totalQueued: number;
  totalFlushed: number;
  totalFlushes: number;
  totalFailedFlushes: number;
  lastFlushedAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
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
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly writer: TradeLogWriter;
  private readonly scheduler: TradeLogScheduler;
  private readonly clearScheduler: TradeLogClearScheduler;
  private readonly logger: Pick<Console, 'log' | 'error'>;
  private stats: TradeLoggerStats = {
    pendingCount: 0,
    totalQueued: 0,
    totalFlushed: 0,
    totalFlushes: 0,
    totalFailedFlushes: 0,
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
      this.flush().catch((err) => {
        this.logger.error('[TradeLogger] Batch flush error:', err);
      });
    }, this.flushIntervalMs);
  }

  // Queue a trade for async logging (non-blocking)
  async logTrade(trade: Omit<InsertTrade, 'id' | 'timestamp'>): Promise<void> {
    this.pendingTrades.push(trade as InsertTrade);
    this.stats.pendingCount = this.pendingTrades.length;
    this.stats.totalQueued += 1;
    
    // Flush immediately if batch size reached
    if (this.pendingTrades.length >= this.batchSize) {
      setImmediate(() => this.flush());
    }
  }

  getStats(): TradeLoggerStats {
    return {
      ...this.stats,
      pendingCount: this.pendingTrades.length,
    };
  }

  // Flush pending trades to database
  async flush(): Promise<void> {
    if (this.pendingTrades.length === 0) {
      return;
    }

    const tradesToWrite = this.pendingTrades.splice(0, this.batchSize);
    this.stats.pendingCount = this.pendingTrades.length;
    
    try {
      await this.writer(tradesToWrite);
      this.stats.totalFlushed += tradesToWrite.length;
      this.stats.totalFlushes += 1;
      this.stats.lastFlushedAt = new Date().toISOString();
      this.logger.log(`[TradeLogger] Flushed ${tradesToWrite.length} trades to DB`);
    } catch (error) {
      this.logger.error('[TradeLogger] Failed to write trades:', error);
      // Re-queue failed trades
      this.pendingTrades.unshift(...tradesToWrite);
      this.stats.pendingCount = this.pendingTrades.length;
      this.stats.totalFailedFlushes += 1;
      this.stats.lastErrorAt = new Date().toISOString();
      this.stats.lastErrorMessage = error instanceof Error ? error.message : String(error);
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
}

// Singleton instance
export const tradeLogger = new TradeLogger();
