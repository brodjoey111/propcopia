import test from 'node:test';
import assert from 'node:assert/strict';
import { RithmicAdapter } from './RithmicAdapter';

class FakeRithmicAPI {
  authenticateCalls = 0;
  testConnectionCalls = 0;
  sendOrderCalls = 0;
  disconnectCalls = 0;
  authenticated = false;
  authenticateResult = {
    success: true,
    message: 'Authenticated with Rithmic',
  };
  testConnectionResult: {
    success: boolean;
    message: string;
    data?: unknown[];
  } = {
    success: true,
    message: 'Successfully connected to Rithmic',
    data: [],
  };
  lastSendOrder?: Record<string, unknown>;
  sendOrderImpl = async (params: Record<string, unknown>) => {
    this.lastSendOrder = { ...params };
  };

  async authenticate() {
    this.authenticateCalls += 1;
    this.authenticated = this.authenticateResult.success;
    return this.authenticateResult;
  }

  async testConnection() {
    this.testConnectionCalls += 1;
    return this.testConnectionResult;
  }

  async sendOrder(params: Record<string, unknown>) {
    this.sendOrderCalls += 1;
    await this.sendOrderImpl(params);
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async disconnect() {
    this.disconnectCalls += 1;
    this.authenticated = false;
  }
}

function createConfig() {
  return {
    brokerKey: 'rithmic:follower-1',
    environment: 'test' as const,
    exchange: 'CME',
    credentials: {
      username: 'user-1',
      password: 'pass-1',
      systemName: 'Rithmic Test',
      appName: 'PropCopia',
      appVersion: '1.0.0',
    },
  };
}

test('connect authenticates and caches accounts', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [
    { id: 'acct-1', name: 'Primary', accountType: 'futures', balance: '1000.50', currency: 'USD' },
    { accountId: 'acct-2', name: 'Secondary', accountType: 'sim', balance: 2500, currency: 'USD' },
  ];

  const adapter = new RithmicAdapter(createConfig(), api);
  await adapter.connect();

  const state = adapter.getConnectionState();
  assert.equal(api.authenticateCalls, 1);
  assert.equal(api.testConnectionCalls, 1);
  assert.equal(state.connected, true);
  assert.equal(state.authenticated, true);
  assert.deepEqual(state.brokerAccountIds, ['acct-1', 'acct-2']);
  assert.equal(typeof state.lastConnectedAt, 'string');
  assert.equal(state.lastError, undefined);
});

test('connect failure records lastError', async () => {
  const api = new FakeRithmicAPI();
  api.authenticateResult = {
    success: false,
    message: 'Rithmic rejected login (rp_code=5)',
  };

  const adapter = new RithmicAdapter(createConfig(), api);

  await assert.rejects(() => adapter.connect(), {
    message: 'Rithmic rejected login (rp_code=5)',
  });

  const state = adapter.getConnectionState();
  assert.equal(state.connected, false);
  assert.equal(state.authenticated, false);
  assert.deepEqual(state.brokerAccountIds, []);
  assert.equal(state.lastError, 'Rithmic rejected login (rp_code=5)');
});

test('isConnected reflects adapter state and api authentication state', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [{ id: 'acct-1', name: 'Primary' }];

  const adapter = new RithmicAdapter(createConfig(), api);
  assert.equal(adapter.isConnected(), false);

  await adapter.connect();
  assert.equal(adapter.isConnected(), true);

  api.authenticated = false;
  assert.equal(adapter.isConnected(), false);
});

test('disconnect clears state', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [{ id: 'acct-1', name: 'Primary' }];

  const adapter = new RithmicAdapter(createConfig(), api);
  await adapter.connect();
  await adapter.disconnect();

  const state = adapter.getConnectionState();
  assert.equal(api.disconnectCalls, 1);
  assert.equal(state.connected, false);
  assert.equal(state.authenticated, false);
  assert.deepEqual(state.brokerAccountIds, []);
  assert.equal(typeof state.lastDisconnectedAt, 'string');
});

test('getConnectionState reports timestamps and account IDs', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [{ id: 'acct-1', name: 'Primary' }];

  const adapter = new RithmicAdapter(createConfig(), api);
  await adapter.connect();
  await adapter.disconnect();

  const state = adapter.getConnectionState();
  assert.equal(typeof state.lastConnectedAt, 'string');
  assert.equal(typeof state.lastDisconnectedAt, 'string');
  assert.deepEqual(state.brokerAccountIds, []);
});

test('getAccounts normalizes current API account data', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [
    {
      id: 'acct-1',
      name: 'Primary',
      accountType: 'futures',
      balance: '1500.75',
      currency: 'USD',
    },
    {
      accountId: 'acct-2',
      name: 'Backup',
      accountType: 'sim',
      balance: 900,
      currency: 'EUR',
    },
  ];

  const adapter = new RithmicAdapter(createConfig(), api);
  const accounts = await adapter.getAccounts();

  assert.deepEqual(accounts, [
    {
      accountId: 'acct-1',
      broker: 'rithmic',
      name: 'Primary',
      accountType: 'futures',
      balance: 1500.75,
      currency: 'USD',
    },
    {
      accountId: 'acct-2',
      broker: 'rithmic',
      name: 'Backup',
      accountType: 'sim',
      balance: 900,
      currency: 'EUR',
    },
  ]);
});

test('submitOrder maps MARKET request and returns accepted SENT result', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [{ id: 'acct-1', name: 'Primary' }];
  const adapter = new RithmicAdapter(createConfig(), api);
  await adapter.connect();

  const result = await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'MESU6',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    intentId: 'intent-market',
  });

  assert.equal(api.sendOrderCalls, 1);
  assert.deepEqual(api.lastSendOrder, {
    accountId: 'acct-1',
    symbol: 'MESU6',
    exchange: 'CME',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    price: undefined,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.status, 'SENT');
  assert.equal(typeof result.submittedAt, 'string');
  assert.equal(result.brokerOrderId, undefined);
});

test('submitOrder maps LIMIT request', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [{ id: 'acct-1', name: 'Primary' }];
  const adapter = new RithmicAdapter(createConfig(), api);
  await adapter.connect();

  await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'MESU6',
    side: 'SELL',
    quantity: 1,
    orderType: 'LIMIT',
    limitPrice: 6250.25,
    intentId: 'intent-limit',
  });

  assert.deepEqual(api.lastSendOrder, {
    accountId: 'acct-1',
    symbol: 'MESU6',
    exchange: 'CME',
    side: 'SELL',
    quantity: 1,
    orderType: 'LIMIT',
    price: 6250.25,
  });
});

test('submitOrder propagates API failures', async () => {
  const api = new FakeRithmicAPI();
  api.testConnectionResult.data = [{ id: 'acct-1', name: 'Primary' }];
  api.sendOrderImpl = async () => {
    throw new Error('New order failed: rp_code=7');
  };
  const adapter = new RithmicAdapter(createConfig(), api);
  await adapter.connect();

  await assert.rejects(
    () =>
      adapter.submitOrder({
        accountId: 'acct-1',
        symbol: 'MESU6',
        side: 'BUY',
        quantity: 1,
        orderType: 'MARKET',
        intentId: 'intent-error',
      }),
    {
      message: 'New order failed: rp_code=7',
    },
  );
});

test('submitOrder requires connected state', async () => {
  const adapter = new RithmicAdapter(createConfig(), new FakeRithmicAPI());

  await assert.rejects(
    () =>
      adapter.submitOrder({
        accountId: 'acct-1',
        symbol: 'MESU6',
        side: 'BUY',
        quantity: 1,
        orderType: 'MARKET',
        intentId: 'intent-disconnected',
      }),
    {
      message: 'Rithmic adapter is not connected: rithmic:follower-1',
    },
  );
});

test('getPositions throws not implemented', async () => {
  const adapter = new RithmicAdapter(createConfig(), new FakeRithmicAPI());

  await assert.rejects(() => adapter.getPositions(), {
    message: 'Rithmic position retrieval is not implemented.',
  });
});

test('cancelOrder throws not implemented', async () => {
  const adapter = new RithmicAdapter(createConfig(), new FakeRithmicAPI());

  await assert.rejects(() => adapter.cancelOrder('broker-order-1', 'acct-1'), {
    message: 'Rithmic order cancellation is not implemented.',
  });
});
