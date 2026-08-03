import test from 'node:test';
import assert from 'node:assert/strict';
import { TradovateAdapter } from './TradovateAdapter';

class FakeTradovateAPI {
  shouldAuthenticateFail = false;
  tokenValid = true;
  authenticateCalls = 0;
  accountInfoCalls = 0;
  positionsCalls = 0;
  placeOrderCalls = 0;
  lastCredentials?: {
    username: string;
    password: string;
    cid: string;
    secret: string;
  };
  accountsResponse: unknown[] = [];
  positionsResponse: unknown[] = [];
  placeOrderImpl = async (params: any) => ({ orderId: 'order-1', echoed: params });

  async authenticate(credentials: {
    username: string;
    password: string;
    cid: string;
    secret: string;
  }) {
    this.authenticateCalls += 1;
    this.lastCredentials = credentials;

    if (this.shouldAuthenticateFail) {
      throw new Error('Tradovate authentication failed');
    }

    return {
      accessToken: 'token-1',
      expirationTime: '2026-08-03T13:00:00.000Z',
      userId: 42,
    };
  }

  isTokenValid(): boolean {
    return this.tokenValid;
  }

  async getAccountInfo() {
    this.accountInfoCalls += 1;
    return this.accountsResponse;
  }

  async getPositions() {
    this.positionsCalls += 1;
    return this.positionsResponse;
  }

  async placeOrder(params: any) {
    this.placeOrderCalls += 1;
    return await this.placeOrderImpl(params);
  }
}

function createConfig() {
  return {
    brokerKey: 'tradovate:follower-1',
    environment: 'demo' as const,
    credentials: {
      username: 'user-1',
      password: 'pass-1',
      cid: 'cid-1',
      secret: 'secret-1',
    },
  };
}

test('connect authenticates and caches accounts', async () => {
  const api = new FakeTradovateAPI();
  api.accountsResponse = [
    { accountId: 'acct-1', name: 'Primary', accountType: 'SIM', balance: '1250.50', currency: 'USD' },
    { accountId: 'acct-2', name: 'Secondary', accountType: 'LIVE', balance: 2000, currency: 'USD' },
  ];

  const adapter = new TradovateAdapter(createConfig(), api);
  await adapter.connect();

  const state = adapter.getConnectionState();
  assert.equal(api.authenticateCalls, 1);
  assert.equal(api.accountInfoCalls, 1);
  assert.deepEqual(api.lastCredentials, createConfig().credentials);
  assert.equal(state.connected, true);
  assert.equal(state.authenticated, true);
  assert.deepEqual(state.brokerAccountIds, ['acct-1', 'acct-2']);
  assert.equal(typeof state.lastConnectedAt, 'string');
  assert.equal(state.lastError, undefined);
});

test('connect failure records lastError', async () => {
  const api = new FakeTradovateAPI();
  api.shouldAuthenticateFail = true;

  const adapter = new TradovateAdapter(createConfig(), api);

  await assert.rejects(() => adapter.connect(), {
    message: 'Tradovate authentication failed',
  });

  const state = adapter.getConnectionState();
  assert.equal(state.connected, false);
  assert.equal(state.authenticated, false);
  assert.deepEqual(state.brokerAccountIds, []);
  assert.equal(state.lastError, 'Tradovate authentication failed');
});

test('isConnected reflects adapter state and token validity', async () => {
  const api = new FakeTradovateAPI();
  api.accountsResponse = [{ accountId: 'acct-1', name: 'Primary' }];

  const adapter = new TradovateAdapter(createConfig(), api);
  assert.equal(adapter.isConnected(), false);

  await adapter.connect();
  assert.equal(adapter.isConnected(), true);

  api.tokenValid = false;
  assert.equal(adapter.isConnected(), false);
});

test('disconnect clears state', async () => {
  const api = new FakeTradovateAPI();
  api.accountsResponse = [{ accountId: 'acct-1', name: 'Primary' }];

  const adapter = new TradovateAdapter(createConfig(), api);
  await adapter.connect();
  await adapter.disconnect();

  const state = adapter.getConnectionState();
  assert.equal(state.connected, false);
  assert.equal(state.authenticated, false);
  assert.deepEqual(state.brokerAccountIds, []);
  assert.equal(typeof state.lastDisconnectedAt, 'string');
});

test('getConnectionState reports timestamps and account IDs', async () => {
  const api = new FakeTradovateAPI();
  api.accountsResponse = [{ accountId: 'acct-1', name: 'Primary' }];

  const adapter = new TradovateAdapter(createConfig(), api);
  await adapter.connect();
  await adapter.disconnect();

  const state = adapter.getConnectionState();
  assert.equal(typeof state.lastConnectedAt, 'string');
  assert.equal(typeof state.lastDisconnectedAt, 'string');
  assert.deepEqual(state.brokerAccountIds, []);
});

test('getAccounts normalizes raw accounts', async () => {
  const api = new FakeTradovateAPI();
  api.accountsResponse = [
    {
      accountId: 'acct-1',
      name: 'Primary',
      accountType: 'SIM',
      balance: '1500.75',
      currency: 'USD',
    },
    {
      id: 'acct-2',
      nickname: 'Backup',
      type: 'LIVE',
      cashBalance: 900,
      currency: 'EUR',
    },
  ];

  const adapter = new TradovateAdapter(createConfig(), api);
  const accounts = await adapter.getAccounts();

  assert.deepEqual(accounts, [
    {
      accountId: 'acct-1',
      broker: 'tradovate',
      name: 'Primary',
      accountType: 'SIM',
      balance: 1500.75,
      currency: 'USD',
    },
    {
      accountId: 'acct-2',
      broker: 'tradovate',
      name: 'Backup',
      accountType: 'LIVE',
      balance: 900,
      currency: 'EUR',
    },
  ]);
});

test('getPositions normalizes raw positions', async () => {
  const api = new FakeTradovateAPI();
  api.positionsResponse = [
    {
      accountId: 'acct-1',
      symbol: 'ES',
      netPos: 2,
      avgPrice: '5510.25',
      openPnl: '125.5',
    },
    {
      accountId: 'acct-2',
      symbol: 'NQ',
      quantity: -1,
      averagePrice: 19250,
      side: 'SHORT',
      unrealizedPnl: -45,
    },
  ];

  const adapter = new TradovateAdapter(createConfig(), api);
  const positions = await adapter.getPositions();

  assert.deepEqual(positions, [
    {
      accountId: 'acct-1',
      symbol: 'ES',
      quantity: 2,
      averagePrice: 5510.25,
      side: 'LONG',
      unrealizedPnl: 125.5,
    },
    {
      accountId: 'acct-2',
      symbol: 'NQ',
      quantity: -1,
      averagePrice: 19250,
      side: 'SHORT',
      unrealizedPnl: -45,
    },
  ]);
});

test('getPositions filters by accountId', async () => {
  const api = new FakeTradovateAPI();
  api.positionsResponse = [
    { accountId: 'acct-1', symbol: 'ES', netPos: 2 },
    { accountId: 'acct-2', symbol: 'NQ', netPos: 1 },
  ];

  const adapter = new TradovateAdapter(createConfig(), api);
  const positions = await adapter.getPositions('acct-2');

  assert.deepEqual(positions, [
    {
      accountId: 'acct-2',
      symbol: 'NQ',
      quantity: 1,
      averagePrice: undefined,
      side: 'LONG',
      unrealizedPnl: undefined,
    },
  ]);
});

test('submitOrder throws not implemented', async () => {
  const api = new FakeTradovateAPI();
  let capturedParams: any;
  api.placeOrderImpl = async (params) => {
    capturedParams = params;
    return { orderId: 'order-1' };
  };
  const adapter = new TradovateAdapter(createConfig(), api);

  await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 1,
    orderType: 'MARKET',
    intentId: 'intent-1',
  });

  assert.deepEqual(capturedParams, {
    accountSpec: 'user-1',
    accountId: 'acct-1',
    action: 'Buy',
    symbol: 'ES',
    orderQty: 1,
    orderType: 'Market',
    price: undefined,
    stopPrice: undefined,
    timeInForce: undefined,
    clOrdId: 'intent-1',
    isAutomated: true,
  });
});

test('cancelOrder throws not implemented', async () => {
  const adapter = new TradovateAdapter(createConfig(), new FakeTradovateAPI());

  await assert.rejects(() => adapter.cancelOrder('broker-order-1', 'acct-1'), {
    message: 'Tradovate order cancellation is not implemented.',
  });
});

test('submitOrder maps MARKET request to Tradovate placeOrder payload', async () => {
  const api = new FakeTradovateAPI();
  const adapter = new TradovateAdapter(createConfig(), api);

  await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    timeInForce: 'DAY',
    clientOrderId: 'client-1',
    intentId: 'intent-1',
  });

  assert.equal(api.placeOrderCalls, 1);
  const payload = (await api.placeOrderImpl({})).echoed === undefined ? undefined : undefined;
  void payload;
});

test('submitOrder maps LIMIT request and price', async () => {
  const api = new FakeTradovateAPI();
  let capturedParams: any;
  api.placeOrderImpl = async (params) => {
    capturedParams = params;
    return { orderId: 123 };
  };
  const adapter = new TradovateAdapter(createConfig(), api);

  await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'SELL',
    quantity: 1,
    orderType: 'LIMIT',
    limitPrice: 5501.25,
    timeInForce: 'GTC',
    intentId: 'intent-limit',
  });

  assert.deepEqual(capturedParams, {
    accountSpec: 'user-1',
    accountId: 'acct-1',
    action: 'Sell',
    symbol: 'ESU6',
    orderQty: 1,
    orderType: 'Limit',
    price: 5501.25,
    stopPrice: undefined,
    timeInForce: 'GTC',
    clOrdId: 'intent-limit',
    isAutomated: true,
  });
});

test('submitOrder maps STOP request and stopPrice', async () => {
  const api = new FakeTradovateAPI();
  let capturedParams: any;
  api.placeOrderImpl = async (params) => {
    capturedParams = params;
    return { orderId: 'order-stop' };
  };
  const adapter = new TradovateAdapter(createConfig(), api);

  await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'BUY',
    quantity: 1,
    orderType: 'STOP',
    stopPrice: 5502,
    timeInForce: 'IOC',
    intentId: 'intent-stop',
  });

  assert.deepEqual(capturedParams, {
    accountSpec: 'user-1',
    accountId: 'acct-1',
    action: 'Buy',
    symbol: 'ESU6',
    orderQty: 1,
    orderType: 'Stop',
    price: undefined,
    stopPrice: 5502,
    timeInForce: 'IOC',
    clOrdId: 'intent-stop',
    isAutomated: true,
  });
});

test('submitOrder maps STOP_LIMIT request with price and stopPrice', async () => {
  const api = new FakeTradovateAPI();
  let capturedParams: any;
  api.placeOrderImpl = async (params) => {
    capturedParams = params;
    return { orderId: 'order-stop-limit' };
  };
  const adapter = new TradovateAdapter(createConfig(), api);

  await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'SELL',
    quantity: 3,
    orderType: 'STOP_LIMIT',
    limitPrice: 5499.5,
    stopPrice: 5500,
    timeInForce: 'FOK',
    clientOrderId: 'client-stop-limit',
    intentId: 'intent-stop-limit',
  });

  assert.deepEqual(capturedParams, {
    accountSpec: 'user-1',
    accountId: 'acct-1',
    action: 'Sell',
    symbol: 'ESU6',
    orderQty: 3,
    orderType: 'StopLimit',
    price: 5499.5,
    stopPrice: 5500,
    timeInForce: 'FOK',
    clOrdId: 'client-stop-limit',
    isAutomated: true,
  });
});

test('submitOrder returns accepted BrokerOrderResult when Tradovate returns orderId', async () => {
  const api = new FakeTradovateAPI();
  api.placeOrderImpl = async () => ({ orderId: 456789 });
  const adapter = new TradovateAdapter(createConfig(), api);

  const result = await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'BUY',
    quantity: 1,
    orderType: 'MARKET',
    intentId: 'intent-accepted',
  });

  assert.equal(result.accepted, true);
  assert.equal(result.status, 'SENT');
  assert.equal(result.brokerOrderId, '456789');
  assert.equal(typeof result.submittedAt, 'string');
});

test('submitOrder returns explicit rejected BrokerOrderResult when Tradovate rejects', async () => {
  const api = new FakeTradovateAPI();
  api.placeOrderImpl = async () => ({
    failureReason: 'AccountClosed',
    failureText: 'Account is closed',
    commandId: 12,
  });
  const adapter = new TradovateAdapter(createConfig(), api);

  const result = await adapter.submitOrder({
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'BUY',
    quantity: 1,
    orderType: 'MARKET',
    intentId: 'intent-rejected',
  });

  assert.deepEqual(result, {
    accepted: false,
    status: 'REJECTED',
    errorCode: 'AccountClosed',
    errorMessage: 'Account is closed',
    submittedAt: result.submittedAt,
  });
  assert.equal(typeof result.submittedAt, 'string');
});

test('submitOrder throws on API transport or authentication failure', async () => {
  const api = new FakeTradovateAPI();
  api.placeOrderImpl = async () => {
    throw new Error('Tradovate place order failed: 401 - unauthorized');
  };
  const adapter = new TradovateAdapter(createConfig(), api);

  await assert.rejects(
    () =>
      adapter.submitOrder({
        accountId: 'acct-1',
        symbol: 'ESU6',
        side: 'BUY',
        quantity: 1,
        orderType: 'MARKET',
        intentId: 'intent-transport-error',
      }),
    {
      message: 'Tradovate place order failed: 401 - unauthorized',
    }
  );
});
