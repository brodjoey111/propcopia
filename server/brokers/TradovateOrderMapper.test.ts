import test from 'node:test';
import assert from 'node:assert/strict';
import { TradovateOrderMapper } from './TradovateOrderMapper';
import type { BrokerOrderRequest } from '../execution-types';

function createRequest(
  overrides: Partial<BrokerOrderRequest> = {},
): BrokerOrderRequest {
  return {
    accountId: 'acct-1',
    symbol: 'ESU6',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    intentId: 'intent-1',
    ...overrides,
  };
}

function createMapper() {
  return new TradovateOrderMapper({
    accountSpec: 'user-1',
  });
}

test('MARKET mapping', () => {
  const mapper = createMapper();

  assert.deepEqual(mapper.mapOrder(createRequest()), {
    accountSpec: 'user-1',
    accountId: 'acct-1',
    action: 'Buy',
    symbol: 'ESU6',
    orderQty: 2,
    orderType: 'Market',
    price: undefined,
    stopPrice: undefined,
    timeInForce: undefined,
    clOrdId: 'intent-1',
    isAutomated: true,
  });
});

test('LIMIT with price', () => {
  const mapper = createMapper();

  assert.deepEqual(
    mapper.mapOrder(
      createRequest({
        side: 'SELL',
        orderType: 'LIMIT',
        quantity: 1,
        limitPrice: 5501.25,
      }),
    ),
    {
      accountSpec: 'user-1',
      accountId: 'acct-1',
      action: 'Sell',
      symbol: 'ESU6',
      orderQty: 1,
      orderType: 'Limit',
      price: 5501.25,
      stopPrice: undefined,
      timeInForce: undefined,
      clOrdId: 'intent-1',
      isAutomated: true,
    },
  );
});

test('STOP with stopPrice', () => {
  const mapper = createMapper();

  assert.deepEqual(
    mapper.mapOrder(
      createRequest({
        orderType: 'STOP',
        stopPrice: 5502,
      }),
    ),
    {
      accountSpec: 'user-1',
      accountId: 'acct-1',
      action: 'Buy',
      symbol: 'ESU6',
      orderQty: 2,
      orderType: 'Stop',
      price: undefined,
      stopPrice: 5502,
      timeInForce: undefined,
      clOrdId: 'intent-1',
      isAutomated: true,
    },
  );
});

test('STOP_LIMIT with both prices', () => {
  const mapper = createMapper();

  assert.deepEqual(
    mapper.mapOrder(
      createRequest({
        side: 'SELL',
        quantity: 3,
        orderType: 'STOP_LIMIT',
        limitPrice: 5499.5,
        stopPrice: 5500,
      }),
    ),
    {
      accountSpec: 'user-1',
      accountId: 'acct-1',
      action: 'Sell',
      symbol: 'ESU6',
      orderQty: 3,
      orderType: 'StopLimit',
      price: 5499.5,
      stopPrice: 5500,
      timeInForce: undefined,
      clOrdId: 'intent-1',
      isAutomated: true,
    },
  );
});

test('BUY and SELL mapping', () => {
  const mapper = createMapper();

  assert.equal(mapper.mapOrder(createRequest({ side: 'BUY' })).action, 'Buy');
  assert.equal(mapper.mapOrder(createRequest({ side: 'SELL' })).action, 'Sell');
});

test('DAY mapping', () => {
  const mapper = createMapper();

  assert.equal(
    mapper.mapOrder(createRequest({ timeInForce: 'DAY' })).timeInForce,
    'Day',
  );
});

test('GTC, IOC, and FOK mapping', () => {
  const mapper = createMapper();

  assert.equal(
    mapper.mapOrder(createRequest({ timeInForce: 'GTC' })).timeInForce,
    'GTC',
  );
  assert.equal(
    mapper.mapOrder(createRequest({ timeInForce: 'IOC' })).timeInForce,
    'IOC',
  );
  assert.equal(
    mapper.mapOrder(createRequest({ timeInForce: 'FOK' })).timeInForce,
    'FOK',
  );
});

test('clientOrderId preferred for clOrdId', () => {
  const mapper = createMapper();

  assert.equal(
    mapper.mapOrder(
      createRequest({
        clientOrderId: 'client-1',
      }),
    ).clOrdId,
    'client-1',
  );
});

test('intentId fallback for clOrdId', () => {
  const mapper = createMapper();

  assert.equal(
    mapper.mapOrder(
      createRequest({
        clientOrderId: undefined,
        intentId: 'intent-fallback',
      }),
    ).clOrdId,
    'intent-fallback',
  );
});
