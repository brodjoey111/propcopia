import test from 'node:test';
import assert from 'node:assert/strict';
import { TradeLogger } from './trade-logger';

function createTrade(symbol: string) {
  return {
    masterAccountId: 'master-1',
    symbol,
    action: 'BUY',
    quantity: 1,
    price: '6400.25',
    status: 'copied',
  } as const;
}

test('flush writes a full batch and updates stats', async () => {
  const writes: any[][] = [];
  const logger = new TradeLogger({
    autoStart: false,
    batchSize: 2,
    writer: async (entries) => {
      writes.push(entries);
    },
    logger: {
      log() {},
      error() {},
    },
  });

  await logger.logTrade(createTrade('ES'));
  await logger.logTrade(createTrade('NQ'));
  await logger.flush();

  assert.equal(writes.length, 1);
  assert.equal(writes[0].length, 2);
  assert.equal(logger.getStats().totalFlushed, 2);
  assert.equal(logger.getStats().pendingCount, 0);
});

test('failed flush re-queues trades and records the error stats', async () => {
  let attempts = 0;
  const logger = new TradeLogger({
    autoStart: false,
    writer: async () => {
      attempts += 1;
      throw new Error('db unavailable');
    },
    logger: {
      log() {},
      error() {},
    },
  });

  await logger.logTrade(createTrade('ES'));
  await logger.flush();

  assert.equal(attempts, 1);
  assert.equal(logger.getStats().pendingCount, 1);
  assert.equal(logger.getStats().totalFailedFlushes, 1);
  assert.equal(logger.getStats().lastErrorMessage, 'db unavailable');
});

test('shutdown drains queued trades even when auto-start is disabled', async () => {
  const flushedSymbols: string[] = [];
  const logger = new TradeLogger({
    autoStart: false,
    batchSize: 10,
    writer: async (entries) => {
      for (const entry of entries) {
        flushedSymbols.push(entry.symbol);
      }
    },
    logger: {
      log() {},
      error() {},
    },
  });

  await logger.logTrade(createTrade('ES'));
  await logger.logTrade(createTrade('YM'));
  await logger.shutdown();

  assert.deepEqual(flushedSymbols, ['ES', 'YM']);
  assert.equal(logger.getStats().pendingCount, 0);
  assert.equal(logger.getStats().totalFlushed, 2);
});
