import test from 'node:test';
import assert from 'node:assert/strict';
import { propCopiaEventBus } from './event-bus';
import { TradeHistoryStore } from './trade-history-store';

test('tracks the full intent lifecycle from created through filled', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-1',
      masterAccountId: 'master-1',
      masterFillId: 'fill-1',
      followerAccountId: 'follower-1',
      symbol: 'ES',
      side: 'BUY',
      quantity: 2,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.queued', {
    intentId: 'intent-1',
    followerAccountId: 'follower-1',
    brokerKey: 'follower-ws:follower-1',
    queuedAt: '2026-08-04T12:00:01.000Z',
  });
  propCopiaEventBus.publish('execution.sent', {
    intentId: 'intent-1',
    followerAccountId: 'follower-1',
    brokerKey: 'follower-ws:follower-1',
    brokerOrderId: 'broker-1',
    submittedAt: '2026-08-04T12:00:02.000Z',
  });
  propCopiaEventBus.publish('execution.acknowledged', {
    intentId: 'intent-1',
    followerAccountId: 'follower-1',
    brokerKey: 'follower-ws:follower-1',
    brokerOrderId: 'broker-1',
    acknowledgedAt: '2026-08-04T12:00:03.000Z',
    brokerStatus: 'WORKING',
  });
  propCopiaEventBus.publish('execution.filled', {
    intentId: 'intent-1',
    followerAccountId: 'follower-1',
    brokerKey: 'follower-ws:follower-1',
    brokerOrderId: 'broker-1',
    fillId: 'fill-follow-1',
    filledQuantity: 2,
    averageFillPrice: 6400.25,
    filledAt: '2026-08-04T12:00:04.000Z',
  });

  const record = store.get('intent-1');
  assert.ok(record);
  assert.equal(record.lifecycleStatus, 'FILLED');
  assert.equal(record.brokerOrderId, 'broker-1');
  assert.equal(record.fillId, 'fill-follow-1');
  assert.equal(record.averageFillPrice, 6400.25);
  assert.equal(record.events.length, 5);

  store.stop();
  store.clear();
});

test('tracks rule-level skips without requiring an intent', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('rule.skipped', {
    followerAccountId: 'follower-2',
    masterFillId: 'fill-2',
    symbol: 'NQ',
    reasonCode: 'SYMBOL_BLOCKED',
  });

  const record = store.get('rule:fill-2:follower-2');
  assert.ok(record);
  assert.equal(record?.lifecycleStatus, 'RULE_SKIPPED');
  assert.equal(record?.ruleReasonCode, 'SYMBOL_BLOCKED');

  store.stop();
  store.clear();
});

test('listRecent filters by account ids and statuses', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-a',
      masterAccountId: 'master-a',
      masterFillId: 'fill-a',
      followerAccountId: 'follower-a',
      symbol: 'ES',
      side: 'BUY',
      quantity: 1,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.failed', {
    intentId: 'intent-a',
    followerAccountId: 'follower-a',
    brokerKey: 'follower-ws:follower-a',
    errorMessage: 'Broker down',
    failedAt: '2026-08-04T12:00:01.000Z',
  });
  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-b',
      masterAccountId: 'master-b',
      masterFillId: 'fill-b',
      followerAccountId: 'follower-b',
      symbol: 'YM',
      side: 'SELL',
      quantity: 1,
      createdAt: '2026-08-04T12:00:02.000Z',
      status: 'NEW',
    },
  });

  const filtered = store.listRecent({
    accountIds: ['follower-a'],
    statuses: ['FAILED'],
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].intentId, 'intent-a');
  assert.equal(filtered[0].lifecycleStatus, 'FAILED');

  store.stop();
  store.clear();
});

test('listRecent filters by free-text query across record fields', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-search',
      masterAccountId: 'master-search',
      masterFillId: 'fill-search',
      followerAccountId: 'follower-search',
      symbol: 'MES',
      side: 'BUY',
      quantity: 1,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.failed', {
    intentId: 'intent-search',
    followerAccountId: 'follower-search',
    brokerKey: 'rithmic:follower-search',
    errorMessage: 'Risk breach on follower',
    failedAt: '2026-08-04T12:00:01.000Z',
  });

  const bySymbol = store.listRecent({ query: 'mes' });
  const byReason = store.listRecent({ query: 'risk breach' });

  assert.equal(bySymbol.length, 1);
  assert.equal(bySymbol[0].intentId, 'intent-search');
  assert.equal(byReason.length, 1);
  assert.equal(byReason[0].lifecycleStatus, 'FAILED');

  store.stop();
  store.clear();
});
