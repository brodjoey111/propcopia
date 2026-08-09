import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
    rithmicSystemName: null,
    rithmicExchange: null,
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

  await engine.addFollowerAccount(account, {
    kind: 'legacy_websocket',
    accessToken: 'access-token',
  });
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

function createFakeBrokerAdapter() {
  let connected = false;
  let connectCalls = 0;

  return {
    adapter: {
      async connect() {
        connected = true;
        connectCalls += 1;
      },
      async disconnect() {
        connected = false;
      },
      isConnected() {
        return connected;
      },
      getConnectionState() {
        return {
          connected,
          authenticated: connected,
          brokerAccountIds: ['fake-account'],
        };
      },
      async submitOrder() {
        return {
          accepted: true,
          status: 'SENT',
          submittedAt: new Date().toISOString(),
        } satisfies BrokerOrderResult;
      },
      async cancelOrder() {},
      async getAccounts() {
        return [];
      },
      async getPositions() {
        return [];
      },
    },
    get connectCalls() {
      return connectCalls;
    },
  };
}

function createFillStreamingBrokerAdapter() {
  let connected = false;
  let onFill: ((fill: any) => void) | null = null;

  return {
    adapter: {
      async connect() {
        connected = true;
      },
      async disconnect() {
        connected = false;
      },
      isConnected() {
        return connected;
      },
      getConnectionState() {
        return {
          connected,
          authenticated: connected,
          brokerAccountIds: ['rithmic-fill-account'],
        };
      },
      async submitOrder() {
        return {
          accepted: true,
          status: 'SENT',
          submittedAt: '2026-08-04T13:00:00.000Z',
        } satisfies BrokerOrderResult;
      },
      async cancelOrder() {},
      async getAccounts() {
        return [];
      },
      async getPositions() {
        return [];
      },
      async subscribeToExecutionFills(_accountId: string, callback: (fill: any) => void) {
        onFill = callback;
        return true;
      },
    },
    emitFill(fill: any) {
      onFill?.(fill);
    },
  };
}

function createFakeRithmicMasterApi() {
  let subscribedAccountId: string | null = null;
  let callback: ((fill: any) => void) | null = null;
  let stopCalls = 0;
  let authenticateCalls = 0;
  let testConnectionCalls = 0;
  let sendOrderCalls = 0;
  let disconnectCalls = 0;
  let authenticated = true;
  const sentOrders: any[] = [];

  return {
    api: {
      async subscribeToOrderFills(accountId: string, onFill: (fill: any) => void) {
        subscribedAccountId = accountId;
        callback = onFill;
      },
      async stopOrderFillStream() {
        stopCalls += 1;
      },
      async authenticate() {
        authenticateCalls += 1;
        authenticated = true;
        return {
          success: true,
          message: 'Authenticated with Rithmic',
        };
      },
      async testConnection() {
        testConnectionCalls += 1;
        return {
          success: true,
          message: 'Connected',
          data: [],
        };
      },
      async sendOrder(order: any) {
        sendOrderCalls += 1;
        sentOrders.push(order);
      },
      isAuthenticated() {
        return authenticated;
      },
      async disconnect() {
        disconnectCalls += 1;
        authenticated = false;
      },
      getCredentials() {
        return {
          username: 'shared-user',
          password: 'shared-pass',
          environment: 'test',
          systemName: 'Rithmic Test',
          appName: 'PropCopia',
          appVersion: '1.0.0',
        };
      },
    },
    emitFill(fill: any) {
      callback?.(fill);
    },
    get subscribedAccountId() {
      return subscribedAccountId;
    },
    get stopCalls() {
      return stopCalls;
    },
    get authenticateCalls() {
      return authenticateCalls;
    },
    get testConnectionCalls() {
      return testConnectionCalls;
    },
    get sendOrderCalls() {
      return sendOrderCalls;
    },
    get disconnectCalls() {
      return disconnectCalls;
    },
    get sentOrders() {
      return sentOrders;
    },
  };
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

test('addFollowerAccount accepts the new brokerConfig union and legacy websocket config preserves current behavior', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-union'), socket);

  const runtime = getFollowerConnection(engine, 'follower-union');
  assert.equal(runtime.brokerKind, 'legacy_websocket');
  assert.equal(runtime.brokerKey, 'follower-ws:follower-union');
  assert.equal(runtime.accessToken, 'access-token');
});

test('legacy config creates the temporary websocket adapter', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-legacy'), socket);

  const adapter = getAdapter(engine, 'follower-legacy');
  assert.equal(adapter.constructor.name, 'FollowerWebSocketBrokerAdapter');
});

test('Tradovate config selects TradovateAdapter', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fake = createFakeBrokerAdapter();

  (engine as any).createFollowerBrokerAdapter = () => fake.adapter;

  await engine.addFollowerAccount(
    createFollowerAccount('follower-tradovate'),
    {
      kind: 'tradovate',
      environment: 'demo',
      username: 'user-1',
      password: 'pass-1',
      cid: 'cid-1',
      secret: 'secret-1',
    },
  );

  const runtime = getFollowerConnection(engine, 'follower-tradovate');
  const adapter = getAdapter(engine, 'follower-tradovate');
  assert.equal(runtime.brokerKind, 'tradovate');
  assert.equal(adapter, fake.adapter);
});

test('Rithmic config selects RithmicAdapter', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fake = createFakeBrokerAdapter();

  (engine as any).createFollowerBrokerAdapter = () => fake.adapter;

  await engine.addFollowerAccount(
    createFollowerAccount('follower-rithmic', {
      platform: 'Rithmic',
      rithmicAccountId: 'rithmic-broker-1',
      rithmicSystemName: 'Rithmic Test',
    }),
    {
      kind: 'rithmic',
      environment: 'test',
      username: 'user-1',
      password: 'pass-1',
      exchange: 'CME',
      systemName: 'Rithmic Test',
    },
  );

  const runtime = getFollowerConnection(engine, 'follower-rithmic');
  const adapter = getAdapter(engine, 'follower-rithmic');
  assert.equal(runtime.brokerKind, 'rithmic');
  assert.equal(adapter, fake.adapter);
});

test('Rithmic follower reuses the connected master login when credentials match', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fakeMaster = createFakeRithmicMasterApi();
  engine.setRithmicMasterBrokerAccountId('master-broker-1');

  await engine.connectRithmicMasterAccount('master-rithmic', fakeMaster.api as any);

  await engine.addFollowerAccount(
    createFollowerAccount('follower-rithmic-shared', {
      platform: 'Rithmic',
      rithmicUsername: 'shared-user',
      rithmicAccountId: 'shared-follower-broker',
      rithmicPassword: 'shared-pass',
      rithmicEnvironment: 'test',
      rithmicSystemName: 'Rithmic Test',
      rithmicExchange: 'CME',
    }),
    {
      kind: 'rithmic',
      environment: 'test',
      username: 'shared-user',
      password: 'shared-pass',
      exchange: 'CME',
      systemName: 'Rithmic Test',
    },
  );

  const runtime = getFollowerConnection(engine, 'follower-rithmic-shared');

  assert.equal(runtime.brokerKind, 'rithmic');
  assert.equal(fakeMaster.authenticateCalls, 0);
  assert.equal(fakeMaster.testConnectionCalls, 0);
  assert.equal(runtime.connectionState?.connected, true);
  assert.equal(runtime.connectionState?.authenticated, true);
  assert.deepEqual(runtime.connectionState?.brokerAccountIds, ['shared-user-shared']);
  assert.equal(typeof runtime.connectionState?.lastConnectedAt, 'string');
  assert.equal(runtime.connectionState?.lastError, undefined);

  await runtime.adapter.submitOrder({
    accountId: runtime.brokerAccountId,
    symbol: 'MESU6',
    side: 'BUY',
    quantity: 1,
    orderType: 'MARKET',
    intentId: 'intent-rithmic-shared',
  });

  assert.equal(fakeMaster.sendOrderCalls, 1);
  assert.equal(fakeMaster.sentOrders[0]?.accountId, 'shared-follower-broker');

  await runtime.adapter.disconnect();
  assert.equal(fakeMaster.disconnectCalls, 0);
});

test('non-legacy broker adapters are connected before registration completes', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fake = createFakeBrokerAdapter();

  (engine as any).createFollowerBrokerAdapter = () => fake.adapter;

  await engine.addFollowerAccount(
    createFollowerAccount('follower-connected'),
    {
      kind: 'tradovate',
      environment: 'demo',
      username: 'user-1',
      password: 'pass-1',
      cid: 'cid-1',
      secret: 'secret-1',
    },
  );

  const runtime = getFollowerConnection(engine, 'follower-connected');

  assert.equal(fake.connectCalls, 1);
  assert.deepEqual(runtime.connectionState, {
    connected: true,
    authenticated: true,
    brokerAccountIds: ['fake-account'],
  });
});

test('connectRithmicMasterAccount subscribes to fills and routes them into the copy engine', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-rithmic-master'), socket);

  const fakeMaster = createFakeRithmicMasterApi();
  engine.setRithmicMasterBrokerAccountId('apex-broker-27');
  await engine.connectRithmicMasterAccount('master-rithmic', fakeMaster.api as any);

  assert.equal(fakeMaster.subscribedAccountId, 'apex-broker-27');

  fakeMaster.emitFill({
    accountId: 'master-rithmic',
    symbol: 'ES',
    side: 'BUY',
    quantity: 1,
    price: 6400.25,
    timestamp: Date.parse('2026-08-03T12:00:00.000Z'),
    fillId: 'rithmic-fill-1',
  });

  await waitFor(() => socket.sentMessages.length === 1);
  const payload = JSON.parse(socket.sentMessages[0]);
  assert.equal(payload.symbol, 'ES');
  assert.equal(payload.action, 'BUY');
  assert.equal(payload.quantity, 1);
  assert.equal(payload.orderType, 'Market');

  const status = engine.getStatus();
  assert.equal(status.masterBrokerAccountId, 'apex-broker-27');
  assert.equal(status.lastMasterFillId, 'rithmic-fill-1');
  assert.equal(status.lastMasterFillSymbol, 'ES');
  assert.equal(status.lastMasterFillAt, '2026-08-03T12:00:00.000Z');
});

test('permanent config values are not stored in the follower runtime record', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fake = createFakeBrokerAdapter();

  (engine as any).createFollowerBrokerAdapter = () => fake.adapter;

  await engine.addFollowerAccount(
    createFollowerAccount('follower-no-creds'),
    {
      kind: 'tradovate',
      environment: 'demo',
      username: 'user-1',
      password: 'pass-1',
      cid: 'cid-1',
      secret: 'secret-1',
    },
  );

  const runtime = getFollowerConnection(engine, 'follower-no-creds') as Record<string, unknown>;
  assert.equal('username' in runtime, false);
  assert.equal('password' in runtime, false);
  assert.equal('cid' in runtime, false);
  assert.equal('secret' in runtime, false);
  assert.equal('exchange' in runtime, false);
  assert.equal('systemName' in runtime, false);
});

test('current route delegates follower config selection to the account resolver helper', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /resolveTradeCopyFollowerConnections/);
  assert.match(routesSource, /resolveTradeCopyFollowerConnection/);
  assert.match(routesSource, /followerConnection\.brokerConfig/);
  assert.match(routesSource, /await engine\.addFollowerAccount\(/);
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

test('getStatus reports readiness from master and follower connections', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const socket = new FakeFollowerWebSocket();
  await addFollowerWithWebSocket(engine, createFollowerAccount('follower-status'), socket);

  const beforeMaster = engine.getStatus();
  assert.equal(beforeMaster.masterAccountId, null);
  assert.equal(beforeMaster.masterConnected, false);
  assert.equal(beforeMaster.masterConnectionType, 'none');
  assert.equal(beforeMaster.followerCount, 1);
  assert.equal(beforeMaster.connectedFollowerCount, 1);
  assert.equal(beforeMaster.ready, false);

  const fakeMaster = createFakeRithmicMasterApi();
  engine.setRithmicMasterBrokerAccountId('master-broker-1');
  await engine.connectRithmicMasterAccount('master-rithmic', fakeMaster.api as any);

  const afterMaster = engine.getStatus();
  assert.equal(afterMaster.masterAccountId, 'master-rithmic');
  assert.equal(afterMaster.masterConnected, true);
  assert.equal(afterMaster.masterConnectionType, 'rithmic');
  assert.equal(afterMaster.followerCount, 1);
  assert.equal(afterMaster.connectedFollowerCount, 1);
  assert.equal(afterMaster.ready, true);
  assert.deepEqual(afterMaster.followers, [
    {
      accountId: 'follower-status',
      brokerKind: 'legacy_websocket',
      connected: true,
    },
  ]);
});

test('getStatus keeps a follower ready after a successful authenticated connect state snapshot', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fake = createFakeBrokerAdapter();

  (engine as any).createFollowerBrokerAdapter = () => ({
    ...fake.adapter,
    isConnected() {
      return false;
    },
    getConnectionState() {
      return {
        connected: true,
        authenticated: true,
        brokerAccountIds: ['snapshot-account'],
      };
    },
  });

  await engine.addFollowerAccount(
    createFollowerAccount('follower-snapshot', {
      platform: 'Rithmic',
      rithmicAccountId: 'snapshot-broker-1',
      rithmicSystemName: 'Rithmic Test',
    }),
    {
      kind: 'rithmic',
      environment: 'test',
      username: 'user-1',
      password: 'pass-1',
      exchange: 'CME',
      systemName: 'Rithmic Test',
    },
  );

  const status = engine.getStatus();
  assert.equal(status.connectedFollowerCount, 1);
  assert.deepEqual(status.followers, [
    {
      accountId: 'follower-snapshot',
      brokerKind: 'rithmic',
      connected: true,
    },
  ]);
});

test('disconnect stops the Rithmic master fill stream when it is active', async () => {
  const engine = new TradeCopyEngine('demo', new TradeIntentManager());
  const fakeMaster = createFakeRithmicMasterApi();
  engine.setRithmicMasterBrokerAccountId('master-broker-1');

  await engine.connectRithmicMasterAccount('master-rithmic', fakeMaster.api as any);
  await engine.disconnect();

  assert.equal(fakeMaster.stopCalls, 1);
  assert.equal(engine.getStatus().masterAccountId, null);
  assert.equal(engine.getStatus().masterBrokerAccountId, null);
  assert.equal(engine.getStatus().lastMasterFillAt, null);
});

test('follower execution fill stream records FILLED status for matching completed execution', async () => {
  const tradeIntentManager = new TradeIntentManager();
  const engine = new TradeCopyEngine('demo', tradeIntentManager);
  const fake = createFillStreamingBrokerAdapter();

  (engine as any).createFollowerBrokerAdapter = () => fake.adapter;

  await engine.addFollowerAccount(
    createFollowerAccount('follower-rithmic-fill', {
      platform: 'Rithmic',
      rithmicAccountId: 'rithmic-fill-account',
      rithmicSystemName: 'Rithmic Test',
    }),
    {
      kind: 'rithmic',
      environment: 'test',
      username: 'user-1',
      password: 'pass-1',
      exchange: 'CME',
      systemName: 'Rithmic Test',
    },
  );

  await copyTrade(engine, 'fill-rithmic-follower');

  const executionManager = getExecutionManager(engine);
  const execution = executionManager.getAllExecutions()[0];
  assert.equal(execution.status, 'COMPLETED');
  assert.equal(tradeIntentManager.getIntent(execution.intentId)?.status, 'SENT');

  fake.emitFill({
    accountId: 'rithmic-fill-account',
    brokerKey: 'follower-ws:follower-rithmic-fill',
    symbol: 'ES',
    side: 'BUY',
    fillId: 'follower-fill-1',
    filledAt: '2026-08-04T13:00:05.000Z',
    filledQuantity: 2,
    averageFillPrice: 6402.5,
  });

  assert.equal(tradeIntentManager.getIntent(execution.intentId)?.status, 'FILLED');
  assert.equal(executionManager.getExecutionState(execution.intentId)?.fillId, 'follower-fill-1');
  assert.equal(executionManager.getExecutionState(execution.intentId)?.averageFillPrice, 6402.5);
});
