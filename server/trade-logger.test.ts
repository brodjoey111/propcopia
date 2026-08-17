import test from 'node:test';
import assert from 'node:assert/strict';
import { tradeLogger, TradeLogger } from './trade-logger';

test.after(async () => {
  await tradeLogger.shutdown();
});

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
  assert.equal(logger.getStats().maxPendingCount, 2);
  assert.equal(logger.getStats().lastSuccessfulBatchSize, 2);
  assert.equal(logger.getStats().isFlushing, false);
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
  assert.equal(logger.getStats().maxPendingCount, 1);
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
  assert.equal(logger.getStats().maxPendingCount, 2);
});

test('auto-start timer does not keep a clean process alive', async () => {
  let unrefCalls = 0;
  const timer = {
    unref() {
      unrefCalls += 1;
      return timer;
    },
  } as unknown as NodeJS.Timeout;
  const logger = new TradeLogger({
    scheduler: () => timer,
    clearScheduler() {},
    writer: async () => {},
    logger: {
      log() {},
      error() {},
    },
  });

  assert.equal(unrefCalls, 1);
  await logger.shutdown();
});

test('flush exposes in-flight state while a batch write is pending', async () => {
  let resolveWrite: (() => void) | undefined;
  const logger = new TradeLogger({
    autoStart: false,
    writer: async () =>
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      }),
    logger: {
      log() {},
      error() {},
    },
  });

  await logger.logTrade(createTrade('ES'));
  const flushPromise = logger.flush();

  assert.equal(logger.getStats().isFlushing, true);

  resolveWrite?.();
  await flushPromise;

  assert.equal(logger.getStats().isFlushing, false);
});

test('threshold-triggered flushes stay serialized and capture peak queue depth', async () => {
  const writes: string[][] = [];
  let activeWrites = 0;
  let maxActiveWrites = 0;
  const logger = new TradeLogger({
    autoStart: false,
    batchSize: 2,
    writer: async (entries) => {
      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      writes.push(entries.map((entry) => entry.symbol));
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeWrites -= 1;
    },
    logger: {
      log() {},
      error() {},
    },
  });

  await logger.logTrade(createTrade('ES'));
  await logger.logTrade(createTrade('NQ'));
  await logger.logTrade(createTrade('YM'));
  await logger.logTrade(createTrade('RTY'));

  await new Promise((resolve) => setTimeout(resolve, 40));

  assert.deepEqual(writes, [['ES', 'NQ'], ['YM', 'RTY']]);
  assert.equal(maxActiveWrites, 1);
  assert.equal(logger.getStats().pendingCount, 0);
  assert.equal(logger.getStats().maxPendingCount, 4);
  assert.equal(logger.getStats().totalFlushed, 4);
  assert.equal(logger.getStats().lastSuccessfulBatchSize, 2);
});
