import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import type { Account } from '@shared/schema';
import { TradeIntentManager } from './trade-intent-manager';
import { TradeCopyEngine, calculateFollowerOrder } from './trade-copy-engine';
import type { BrokerOrderRequest, BrokerOrderResult } from './execution-types';

class FakeFollowerWebSocket {
  readyState: number;
  sentMessages: string[] = [];
  closeCalls = 0;
  throwOnSend?: Error;

  constructor(readyState = WebSocket.OPEN) {
    this.readyState = readyState;
  }

  send(payload: string): void {
    if (this.throwOnSend) {
      throw this.throwOnSend;
    }

    this.sentMessages.push(payload);
  }

  close(): void {
    this.closeCalls += 1;
    this.readyState = WebSocket.CLOSED;
  }
}

function createFollowerAccount(
  accountId: string,
  overrides: Partial<Account> = {}
): Account {
  return {
    id: accountId,
    userId: 'user-1',
    name: `Follower ${accountId}`,
    platform: 'tradovate',
    accountType: 'follower',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    tradeifyUsername: null,
    tradeifyAccountId: null,
    tradeifyApiKey: null,
    rithmicUsername: null,
    rithmicAccountId: null,
    rithmicPassword: null,
    rithmicEnvironment: null,
    apiKey: null,
    apiSecret: null,
    isConnected: true,
    balance: null,
    openPositions: 0,
    pnl: '0',
    riskMode: 'global',
    positionScaling: 100,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: null,
    reverseCopying: false,
    maxContracts: null,
    maxOpenPositions: null,
    allowedDirections: 'both',
    maxDailyLoss: null,
    maxDailyLossPct: null,
    maxWeeklyLoss: null,
    maxWeeklyLossPct: null,
    maxDrawdownPct: null,
    maxConsecutiveLosses: null,
    blockedTickers: [],
    allowedTickers: [],
    maxTradesPerDay: null,
    minAccountBalance: null,
    tradingStartTime: null,
    tradingEndTime: null,
    tradingDays: [],
    cooldownAfterLoss: null,
    onBreachAction: 'pause',
    lastSync: null,
    ...overrides,
  };
}

function createTrade(fillId = 'fill-1') {
  return {
    accountId: 'master-1',
    symbol: 'ES',
    action: 'BUY' as const,
    quantity: 2,
    price: 5500.25,
    timestamp: Date.parse('2026-08-03T12:00:00.000Z'),
    fillId,
  };
}

function createOrderRequest(intentId = 'intent-1'): BrokerOrderRequest {
  return {
    accountId: 'follower-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    intentId,
    clientOrderId: intentId,
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 250): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Condition not met within ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

async function addFollowerWithWebSocket(
  engine: TradeCopyEngine,
  account: Account,
  ws: FakeFollowerWebSocket
): Promise<void> {
  (engine as any).connectFollowerWebSocket = async (connection: any) => {
    connection.ws = ws;
    connection.isReady = ws.readyState === WebSocket.OPEN;
  };

  await engine.addFollowerAccount(account, 'access-token');
}

function getExecutionManager(engine: TradeCopyEngine): any {
  return (engine as any).executionManager;
}

function getAdapter(engine: TradeCopyEngine, accountId: string): any {
  return getExecutionManager(engine).adapters.get(`follower-ws:${accountId}`);
}

function getFollowerConnection(engine: TradeCopyEngine, accountId: string): any {
  return (engine as any).followerConnections.get(accountId);
}

function getFailedSends(engine: TradeCopyEngine): number {
  return (engine as any).failedSends;
}

async function copyTrade(engine: TradeCopyEngine, fillId = 'fill-1'): Promise<void> {
  await (engine as any).copyTradeToFollowers(createTrade(fillId), 0, 1);
}

test('calculateFollowerOrder preserves legacy 100% multiplier behavior', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 4,
    positionScaling: 100,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 4,
    skipped: false,
  });
});

test('calculateFollowerOrder applies 50% multiplier with floor rounding', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 3,
    positionScaling: 50,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 1,
    skipped: false,
  });
});

test('calculateFollowerOrder uses fixed quantity', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 10,
    positionScaling: 25,
    maxContracts: undefined,
    copySizingMode: 'FIXED',
    fixedQuantity: 7,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 7,
    skipped: false,
  });
});

test('calculateFollowerOrder caps fixed quantity by maxContracts', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 10,
    positionScaling: 25,
    maxContracts: 2,
    copySizingMode: 'FIXED',
    fixedQuantity: 7,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 2,
    skipped: false,
  });
});

test('calculateFollowerOrder reverses BUY to SELL', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 2,
    positionScaling: 100,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: true,
  });

  assert.deepEqual(result, {
    action: 'SELL',
    quantity: 2,
    skipped: false,
  });
});

test('calculateFollowerOrder reverses SELL to BUY', () => {
  const result = calculateFollowerOrder({
    masterAction: 'SELL',
    masterQuantity: 2,
    positionScaling: 100,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: true,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 2,
    skipped: false,
  });
});

test('calculateFollowerOrder skips zero quantity', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 1,
    positionScaling: 50,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 0,
    skipped: true,
    skipReason: 'zero_quantity',
  });
});

test('calculateFollowerOrder preserves legacy behavior when new fields are missing', () => {
  const result = calculateFollowerOrder({
    masterAction: 'SELL',
    masterQuantity: 5,
    positionScaling: undefined,
    maxContracts: undefined,
    copySizingMode: undefined,
    fixedQuantity: undefined,
    reverseCopying: undefined,
  });

  assert.deepEqual(result, {
    action: 'SELL',
    quantity: 5,
    skipped: false,
  });
});

test('adapter reads the current mutable websocket after reconnect', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const firstSocket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), firstSocket);

  const secondSocket = new FakeFollowerWebSocket();
  const connection = getFollowerConnection(engine, 'follower-1');
  connection.ws = secondSocket;
  connection.isReady = true;

  const adapter = getAdapter(engine, 'follower-1');
  await adapter.submitOrder(createOrderRequest('intent-reconnect'));

  assert.equal(firstSocket.sentMessages.length, 0);
  assert.equal(secondSocket.sentMessages.length, 1);
});

test('adapter reports disconnected when websocket is unavailable', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket(WebSocket.CLOSED);
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  const connection = getFollowerConnection(engine, 'follower-1');
  const adapter = getAdapter(engine, 'follower-1');

  assert.equal(adapter.isConnected(), false);

  connection.ws = null;
  connection.isReady = false;
  assert.equal(adapter.isConnected(), false);
});

test('adapter sends the exact legacy payload and returns accepted SENT result after ws.send succeeds', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  const adapter = getAdapter(engine, 'follower-1');
  const realNow = Date.now;
  Date.now = () => 123456789;

  try {
    const result = await adapter.submitOrder(createOrderRequest('intent-send-success'));

    assert.deepEqual(JSON.parse(socket.sentMessages[0]), {
      type: 'placeOrder',
      symbol: 'ES',
      action: 'BUY',
      quantity: 2,
      orderType: 'Market',
      timestamp: 123456789,
    });
    assert.equal(result.accepted, true);
    assert.equal(result.status, 'SENT');
    assert.equal(typeof result.submittedAt, 'string');
  } finally {
    Date.now = realNow;
  }
});

test('adapter propagates ws.send errors', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket();
  socket.throwOnSend = new Error('socket send failed');
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  const adapter = getAdapter(engine, 'follower-1');

  await assert.rejects(() => adapter.submitOrder(createOrderRequest('intent-send-error')), {
    message: 'socket send failed',
  });
});

test('allowed follower uses ExecutionManager and completes successfully', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  await copyTrade(engine, 'fill-success');

  const executions = getExecutionManager(engine).getAllExecutions();
  const intents = tradeIntentManager.getAllIntents();

  assert.equal(executions.length, 1);
  assert.equal(executions[0].status, 'COMPLETED');
  assert.equal(intents.length, 1);
  assert.equal(intents[0].status, 'SENT');
  assert.equal(socket.sentMessages.length, 1);
  assert.equal(getFailedSends(engine), 0);
  assert.equal(engine.getLatencyStats().sampleSize, 1);
});

test('failed execution increments failedSends exactly once', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const socket = new FakeFollowerWebSocket(WebSocket.CLOSED);
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  await copyTrade(engine, 'fill-failed');

  const executions = getExecutionManager(engine).getAllExecutions();
  const intents = tradeIntentManager.getAllIntents();

  assert.equal(executions.length, 1);
  assert.equal(executions[0].status, 'FAILED');
  assert.equal(intents.length, 1);
  assert.equal(intents[0].status, 'FAILED');
  assert.equal(getFailedSends(engine), 1);
});

test('skipped rule decisions do not enqueue or increment failedSends', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(
    engine,
    createFollowerAccount('follower-1', { blockedTickers: ['ES'] }),
    socket
  );

  await copyTrade(engine, 'fill-skipped');

  assert.equal(getExecutionManager(engine).getAllExecutions().length, 0);
  assert.equal(tradeIntentManager.getAllIntents().length, 0);
  assert.equal(getFailedSends(engine), 0);
});

test('rejected rule decisions do not enqueue or increment failedSends', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(
    engine,
    createFollowerAccount('follower-1', {
      copySizingMode: 'FIXED',
      fixedQuantity: null,
    }),
    socket
  );

  await copyTrade(engine, 'fill-rejected');

  assert.equal(getExecutionManager(engine).getAllExecutions().length, 0);
  assert.equal(tradeIntentManager.getAllIntents().length, 0);
  assert.equal(getFailedSends(engine), 0);
});

test('TradeCopyEngine does not perform duplicate post-enqueue intent transitions', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  const statuses: string[] = [];
  tradeIntentManager.on('intentUpdated', (intent) => {
    statuses.push(intent.status);
  });

  await copyTrade(engine, 'fill-transitions');

  assert.deepEqual(statuses, ['VALIDATED', 'READY_TO_SEND', 'SENT']);
});

test('multiple eligible followers can execute concurrently', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const firstSocket = new FakeFollowerWebSocket();
  const secondSocket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), firstSocket);
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-2'), secondSocket);

  const executionManager = getExecutionManager(engine);
  const firstAdapter = getAdapter(engine, 'follower-1');
  const secondAdapter = getAdapter(engine, 'follower-2');

  let resolveFirst!: (value: BrokerOrderResult) => void;
  let resolveSecond!: (value: BrokerOrderResult) => void;
  const firstResult = new Promise<BrokerOrderResult>((resolve) => {
    resolveFirst = resolve;
  });
  const secondResult = new Promise<BrokerOrderResult>((resolve) => {
    resolveSecond = resolve;
  });

  firstAdapter.submitOrder = async () => await firstResult;
  secondAdapter.submitOrder = async () => await secondResult;

  const copyPromise = copyTrade(engine, 'fill-concurrent');
  await waitFor(() => executionManager.activeExecutionIntentIds.size === 2);

  assert.equal(executionManager.activeExecutionIntentIds.size, 2);

  resolveFirst({
    accepted: true,
    status: 'SENT',
    submittedAt: '2026-08-03T12:00:00.000Z',
  });
  resolveSecond({
    accepted: true,
    status: 'SENT',
    submittedAt: '2026-08-03T12:00:00.000Z',
  });

  await copyPromise;

  assert.equal(executionManager.getAllExecutions().length, 2);
  assert.equal(
    executionManager.getAllExecutions().filter((record: any) => record.status === 'COMPLETED').length,
    2
  );
});

test('disconnect unregisters follower adapters', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-1'), socket);

  const executionManager = getExecutionManager(engine);
  assert.equal(executionManager.adapters.size, 1);

  await engine.disconnect();

  assert.equal(executionManager.adapters.size, 0);
  assert.equal(socket.closeCalls, 1);
});
