import test from 'node:test';
import assert from 'node:assert/strict';
import { RithmicOrderMapper } from './RithmicOrderMapper';
import type { BrokerOrderRequest } from '../execution-types';

function createRequest(
  overrides: Partial<BrokerOrderRequest> = {},
): BrokerOrderRequest {
  return {
    accountId: 'acct-1',
    symbol: 'MESU6',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    intentId: 'intent-1',
    ...overrides,
  };
}

test('MARKET mapping', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.deepEqual(mapper.mapOrder(createRequest()), {
    accountId: 'acct-1',
    symbol: 'MESU6',
    exchange: 'CME',
    side: 'BUY',
    quantity: 2,
    orderType: 'MARKET',
    price: undefined,
  });
});

test('LIMIT mapping with limitPrice', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.deepEqual(
    mapper.mapOrder(
      createRequest({
        side: 'SELL',
        quantity: 1,
        orderType: 'LIMIT',
        limitPrice: 6250.25,
      }),
    ),
    {
      accountId: 'acct-1',
      symbol: 'MESU6',
      exchange: 'CME',
      side: 'SELL',
      quantity: 1,
      orderType: 'LIMIT',
      price: 6250.25,
    },
  );
});

test('STOP mapping with stopPrice', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.deepEqual(
    mapper.mapOrder(
      createRequest({
        orderType: 'STOP',
        stopPrice: 6249.5,
      }),
    ),
    {
      accountId: 'acct-1',
      symbol: 'MESU6',
      exchange: 'CME',
      side: 'BUY',
      quantity: 2,
      orderType: 'STOP',
      price: 6249.5,
    },
  );
});

test('STOP_LIMIT throws', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.throws(
    () =>
      mapper.mapOrder(
        createRequest({
          orderType: 'STOP_LIMIT',
          limitPrice: 6250,
          stopPrice: 6249.75,
        }),
      ),
    {
      message: 'Rithmic STOP_LIMIT orders are not implemented.',
    },
  );
});

test('BUY preserved', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.equal(mapper.mapOrder(createRequest({ side: 'BUY' })).side, 'BUY');
});

test('SELL preserved', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.equal(mapper.mapOrder(createRequest({ side: 'SELL' })).side, 'SELL');
});

test('configured exchange included', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'COMEX' });

  assert.equal(mapper.mapOrder(createRequest()).exchange, 'COMEX');
});

test('LIMIT without price throws', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.throws(
    () => mapper.mapOrder(createRequest({ orderType: 'LIMIT', limitPrice: undefined })),
    {
      message: 'Rithmic LIMIT orders require limitPrice.',
    },
  );
});

test('STOP without stopPrice throws', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.throws(
    () => mapper.mapOrder(createRequest({ orderType: 'STOP', stopPrice: undefined })),
    {
      message: 'Rithmic STOP orders require stopPrice.',
    },
  );
});

test('zero quantity throws', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });

  assert.throws(
    () => mapper.mapOrder(createRequest({ quantity: 0 })),
    {
      message: 'Rithmic order quantity must be greater than 0.',
    },
  );
});

test('empty exchange throws', () => {
  const mapper = new RithmicOrderMapper({ exchange: '   ' });

  assert.throws(
    () => mapper.mapOrder(createRequest()),
    {
      message: 'Rithmic exchange must not be empty.',
    },
  );
});

test('does not invent unsupported clientOrderId or intentId fields', () => {
  const mapper = new RithmicOrderMapper({ exchange: 'CME' });
  const mapped = mapper.mapOrder(
    createRequest({
      clientOrderId: 'client-1',
      timeInForce: 'DAY',
      intentId: 'intent-custom',
    }),
  ) as Record<string, unknown>;

  assert.equal('clientOrderId' in mapped, false);
  assert.equal('intentId' in mapped, false);
  assert.equal('timeInForce' in mapped, false);
});
