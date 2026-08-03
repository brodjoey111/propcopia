import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { ExecutionManager } from '../execution-manager';
import { TradeIntentManager } from '../trade-intent-manager';
import { TradovateAdapter } from './TradovateAdapter';
import type { ExecutionContext } from '../execution-types';
import type { TradovatePlaceOrderResult } from '../tradovate-api';

class FakeTradovateAPI {
  authenticateCalls = 0;
  accountInfoCalls = 0;
  positionsCalls = 0;
  placeOrderCalls = 0;
  tokenValid = true;
  accountInfoResponse: unknown[] = [
    {
      accountId: 'acct-1',
      name: 'Primary',
      accountType: 'SIM',
      balance: 10000,
      currency: 'USD',
    },
  ];
  lastPlaceOrderParams?: Record<string, unknown>;
  placeOrderImpl: (params: Record<string, unknown>) => Promise<TradovatePlaceOrderResult> = async () => ({
    orderId: 'tradovate-order-1',
  });

  async authenticate() {
    this.authenticateCalls += 1;
    return {
      accessToken: 'token-1',
      expirationTime: '2026-08-03T12:00:00.000Z',
      userId: 1,
    };
  }

  isTokenValid(): boolean {
    return this.tokenValid;
  }

  async getAccountInfo() {
    this.accountInfoCalls += 1;
    return this.accountInfoResponse;
  }

  async getPositions() {
    this.positionsCalls += 1;
    return [];
  }

  async placeOrder(params: Record<string, unknown>) {
    this.placeOrderCalls += 1;
    this.lastPlaceOrderParams = { ...params };
    return await this.placeOrderImpl(params);
  }
}

function createReadyIntent(manager: TradeIntentManager, suffix: string) {
  const intent = manager.createIntent({
    masterAccountId: `master-${suffix}`,
    masterFillId: `fill-${suffix}`,
    followerAccountId: 'acct-1',
    symbol: 'ESZ6',
    side: 'BUY',
    quantity: 2,
  });

  manager.markValidated(intent.intentId);
  return manager.markReadyToSend(intent.intentId);
}

function createContext(
  intent: ReturnType<typeof createReadyIntent>,
  overrides: Partial<ExecutionContext['request']> = {},
): ExecutionContext {
  return {
    intent,
    brokerKey: 'tradovate:test',
    request: {
      accountId: intent.followerAccountId,
      symbol: intent.symbol,
      side: intent.side,
      quantity: intent.quantity,
      orderType: 'MARKET',
      intentId: intent.intentId,
      ...overrides,
    },
  };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 250,
): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Condition not met within ${timeoutMs}ms`);
    }

    await delay(1);
  }
}

async function createHarness() {
  const tradeIntentManager = new TradeIntentManager();
  const executionManager = new ExecutionManager(tradeIntentManager);
  const api = new FakeTradovateAPI();
  const adapter = new TradovateAdapter(
    {
      brokerKey: 'tradovate:test',
      environment: 'demo',
      credentials: {
        username: 'demo-user',
        password: 'demo-pass',
        cid: 'demo-cid',
        secret: 'demo-secret',
      },
    },
    api,
  );

  await adapter.connect();
  executionManager.registerBrokerAdapter('tradovate:test', adapter);

  return {
    tradeIntentManager,
    executionManager,
    adapter,
    api,
  };
}

test('accepted Tradovate order completes execution and sends TradeIntent', async () => {
  const harness = await createHarness();
  harness.api.placeOrderImpl = async () => ({
    orderId: 987654,
  });

  const intent = createReadyIntent(harness.tradeIntentManager, 'accepted');

  await harness.executionManager.enqueue(createContext(intent));
  const result = await harness.executionManager.waitForExecution(intent.intentId);

  assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'COMPLETED');
  assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'SENT');
  assert.equal(result.success, true);
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.brokerResult?.brokerOrderId, '987654');
  assert.deepEqual(harness.api.lastPlaceOrderParams, {
    accountSpec: 'demo-user',
    accountId: 'acct-1',
    action: 'Buy',
    symbol: 'ESZ6',
    orderQty: 2,
    orderType: 'Market',
    price: undefined,
    stopPrice: undefined,
    timeInForce: undefined,
    clOrdId: intent.intentId,
    isAutomated: true,
  });
});

test('explicit Tradovate rejection fails execution and rejects TradeIntent', async () => {
  const harness = await createHarness();
  harness.api.placeOrderImpl = async () => ({
    failureReason: 'RiskRejected',
    failureText: 'Risk check failed',
    commandId: 55,
  });

  const intent = createReadyIntent(harness.tradeIntentManager, 'rejected');

  await harness.executionManager.enqueue(createContext(intent));
  const result = await harness.executionManager.waitForExecution(intent.intentId);

  assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'FAILED');
  assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'REJECTED');
  assert.equal(result.success, false);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.errorCode, 'RiskRejected');
  assert.equal(result.errorMessage, 'Risk check failed');
  assert.equal(result.brokerResult?.accepted, false);
  assert.equal(result.brokerResult?.errorCode, 'RiskRejected');
  assert.equal(result.brokerResult?.errorMessage, 'Risk check failed');
});

test('transport or authentication failure fails execution and marks TradeIntent FAILED', async () => {
  const harness = await createHarness();
  harness.api.placeOrderImpl = async () => {
    throw new Error('Tradovate place order failed: 401 - unauthorized');
  };

  const intent = createReadyIntent(harness.tradeIntentManager, 'transport-failure');

  await harness.executionManager.enqueue(createContext(intent));
  const result = await harness.executionManager.waitForExecution(intent.intentId);

  assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'FAILED');
  assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'FAILED');
  assert.equal(result.success, false);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.errorMessage, 'Tradovate place order failed: 401 - unauthorized');
});

test('intentId is used as clOrdId when clientOrderId is absent', async () => {
  const harness = await createHarness();
  harness.api.placeOrderImpl = async () => ({
    orderId: 'tradovate-order-correlation',
  });

  const intent = createReadyIntent(harness.tradeIntentManager, 'client-order-id');

  await harness.executionManager.enqueue(
    createContext(intent, {
      clientOrderId: undefined,
    }),
  );
  await harness.executionManager.waitForExecution(intent.intentId);

  assert.equal(harness.api.lastPlaceOrderParams?.clOrdId, intent.intentId);
});

test('injected fake TradovateAPI is the only API used', async () => {
  const harness = await createHarness();
  harness.api.placeOrderImpl = async () => ({
    orderId: 'tradovate-order-offline',
  });

  const intent = createReadyIntent(harness.tradeIntentManager, 'offline-only');

  await harness.executionManager.enqueue(createContext(intent));
  await harness.executionManager.waitForExecution(intent.intentId);
  await waitFor(() => harness.api.placeOrderCalls === 1);

  assert.equal(harness.api.authenticateCalls, 1);
  assert.equal(harness.api.accountInfoCalls, 1);
  assert.equal(harness.api.positionsCalls, 0);
  assert.equal(harness.api.placeOrderCalls, 1);
});
