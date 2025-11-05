import { db } from './db';
import { trades, type InsertTrade } from '@shared/schema';

// Batched async trade logger to prevent blocking
export class TradeLogger {
  private pendingTrades: InsertTrade[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly batchSize = 50;
  private readonly flushIntervalMs = 1000;

  constructor() {
    // Start batch flushing interval
    this.batchInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('[TradeLogger] Batch flush error:', err);
      });
    }, this.flushIntervalMs);
  }

  // Queue a trade for async logging (non-blocking)
  async logTrade(trade: Omit<InsertTrade, 'id' | 'timestamp'>): Promise<void> {
    this.pendingTrades.push(trade as InsertTrade);
    
    // Flush immediately if batch size reached
    if (this.pendingTrades.length >= this.batchSize) {
      setImmediate(() => this.flush());
    }
  }

  // Flush pending trades to database
  private async flush(): Promise<void> {
    if (this.pendingTrades.length === 0) {
      return;
    }

    const tradesToWrite = this.pendingTrades.splice(0, this.batchSize);
    
    try {
      await db.insert(trades).values(tradesToWrite);
      console.log(`[TradeLogger] Flushed ${tradesToWrite.length} trades to DB`);
    } catch (error) {
      console.error('[TradeLogger] Failed to write trades:', error);
      // Re-queue failed trades
      this.pendingTrades.unshift(...tradesToWrite);
    }
  }

  // Force flush all pending trades
  async shutdown(): Promise<void> {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    
    while (this.pendingTrades.length > 0) {
      await this.flush();
    }
  }
}

// Singleton instance
export const tradeLogger = new TradeLogger();
