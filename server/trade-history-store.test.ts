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

test('tracks partial fills without forcing the record into a final fill state', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-partial',
      masterAccountId: 'master-partial',
      masterFillId: 'fill-partial',
      followerAccountId: 'follower-partial',
      symbol: 'ES',
      side: 'BUY',
      quantity: 3,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.acknowledged', {
    intentId: 'intent-partial',
    followerAccountId: 'follower-partial',
    brokerKey: 'follower-ws:follower-partial',
    brokerOrderId: 'broker-partial',
    acknowledgedAt: '2026-08-04T12:00:03.000Z',
    brokerStatus: 'WORKING',
  });
  propCopiaEventBus.publish('execution.partial_fill', {
    intentId: 'intent-partial',
    followerAccountId: 'follower-partial',
    brokerKey: 'follower-ws:follower-partial',
    brokerOrderId: 'broker-partial',
    fillId: 'fill-follow-partial',
    filledQuantity: 1,
    cumulativeFilledQuantity: 1,
    remainingQuantity: 2,
    averageFillPrice: 6400.5,
    filledAt: '2026-08-04T12:00:04.000Z',
  });

  const record = store.get('intent-partial');
  assert.ok(record);
  assert.equal(record.lifecycleStatus, 'PARTIALLY_FILLED');
  assert.equal(record.partialFillCount, 1);
  assert.equal(record.filledQuantity, 1);
  assert.equal(record.remainingQuantity, 2);
  assert.equal(record.averageFillPrice, 6400.5);
  assert.equal(record.events[0]?.message, 'Partial fill recorded (1/3)');

  store.stop();
  store.clear();
});

test('ignores duplicate and stale partial fills once progress has already advanced', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-partial-stable',
      masterAccountId: 'master-partial-stable',
      masterFillId: 'fill-partial-stable',
      followerAccountId: 'follower-partial-stable',
      symbol: 'ES',
      side: 'BUY',
      quantity: 3,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.partial_fill', {
    intentId: 'intent-partial-stable',
    followerAccountId: 'follower-partial-stable',
    brokerKey: 'follower-ws:follower-partial-stable',
    brokerOrderId: 'broker-partial-stable',
    fillId: 'fill-follow-partial-stable-a',
    cumulativeFilledQuantity: 2,
    remainingQuantity: 1,
    averageFillPrice: 6400.5,
    filledAt: '2026-08-04T12:00:04.000Z',
  });
  propCopiaEventBus.publish('execution.partial_fill', {
    intentId: 'intent-partial-stable',
    followerAccountId: 'follower-partial-stable',
    brokerKey: 'follower-ws:follower-partial-stable',
    brokerOrderId: 'broker-partial-stable',
    fillId: 'fill-follow-partial-stable-a',
    cumulativeFilledQuantity: 2,
    remainingQuantity: 1,
    averageFillPrice: 6400.5,
    filledAt: '2026-08-04T12:00:03.000Z',
  });
  propCopiaEventBus.publish('execution.partial_fill', {
    intentId: 'intent-partial-stable',
    followerAccountId: 'follower-partial-stable',
    brokerKey: 'follower-ws:follower-partial-stable',
    brokerOrderId: 'broker-partial-stable',
    fillId: 'fill-follow-partial-stable-b',
    cumulativeFilledQuantity: 1,
    remainingQuantity: 2,
    averageFillPrice: 6400.25,
    filledAt: '2026-08-04T12:00:02.000Z',
  });

  const record = store.get('intent-partial-stable');
  assert.ok(record);
  assert.equal(record.lifecycleStatus, 'PARTIALLY_FILLED');
  assert.equal(record.partialFillCount, 1);
  assert.equal(record.filledQuantity, 2);
  assert.equal(record.remainingQuantity, 1);
  assert.equal(record.updatedAt, '2026-08-04T12:00:04.000Z');
  assert.equal(record.events.length, 2);
  assert.equal(record.events[0]?.message, 'Partial fill recorded (2/3)');

  store.stop();
  store.clear();
});

test('late acknowledgements do not downgrade a filled trade history record', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-filled-stable',
      masterAccountId: 'master-filled-stable',
      masterFillId: 'fill-filled-stable',
      followerAccountId: 'follower-filled-stable',
      symbol: 'NQ',
      side: 'SELL',
      quantity: 1,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.filled', {
    intentId: 'intent-filled-stable',
    followerAccountId: 'follower-filled-stable',
    brokerKey: 'rithmic:follower-filled-stable',
    brokerOrderId: 'broker-filled-stable',
    fillId: 'fill-follow-filled-stable',
    filledQuantity: 1,
    averageFillPrice: 22000.25,
    filledAt: '2026-08-04T12:00:04.000Z',
  });
  propCopiaEventBus.publish('execution.acknowledged', {
    intentId: 'intent-filled-stable',
    followerAccountId: 'follower-filled-stable',
    brokerKey: 'rithmic:follower-filled-stable',
    brokerOrderId: 'broker-filled-stable',
    acknowledgedAt: '2026-08-04T12:00:03.000Z',
    brokerStatus: 'WORKING',
  });

  const record = store.get('intent-filled-stable');
  assert.ok(record);
  assert.equal(record.lifecycleStatus, 'FILLED');
  assert.equal(record.filledAt, '2026-08-04T12:00:04.000Z');
  assert.equal(record.acknowledgedAt, undefined);
  assert.equal(record.events.length, 2);
  assert.equal(record.events[0]?.type, 'execution.filled');

  store.stop();
  store.clear();
});

test('duplicate filled events do not append redundant terminal history entries', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-filled-duplicate',
      masterAccountId: 'master-filled-duplicate',
      masterFillId: 'fill-filled-duplicate',
      followerAccountId: 'follower-filled-duplicate',
      symbol: 'YM',
      side: 'BUY',
      quantity: 2,
      createdAt: '2026-08-04T12:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.filled', {
    intentId: 'intent-filled-duplicate',
    followerAccountId: 'follower-filled-duplicate',
    brokerKey: 'follower-ws:follower-filled-duplicate',
    brokerOrderId: 'broker-filled-duplicate',
    fillId: 'fill-follow-duplicate',
    filledQuantity: 2,
    averageFillPrice: 41000.75,
    filledAt: '2026-08-04T12:00:04.000Z',
  });
  propCopiaEventBus.publish('execution.filled', {
    intentId: 'intent-filled-duplicate',
    followerAccountId: 'follower-filled-duplicate',
    brokerKey: 'follower-ws:follower-filled-duplicate',
    brokerOrderId: 'broker-filled-duplicate',
    fillId: 'fill-follow-duplicate',
    filledQuantity: 2,
    averageFillPrice: 41000.75,
    filledAt: '2026-08-04T12:00:04.000Z',
  });

  const record = store.get('intent-filled-duplicate');
  assert.ok(record);
  assert.equal(record.lifecycleStatus, 'FILLED');
  assert.equal(record.events.length, 2);
  assert.equal(record.events[0]?.type, 'execution.filled');

  store.stop();
  store.clear();
});

test('tracks a cancelled intent as a terminal cancelled history record', () => {
  const store = new TradeHistoryStore();
  store.start();

  const intent = {
    intentId: 'intent-cancelled',
    masterAccountId: 'master-cancelled',
    masterFillId: 'fill-cancelled',
    followerAccountId: 'follower-cancelled',
    symbol: 'NQ',
    side: 'SELL' as const,
    quantity: 1,
    createdAt: '2026-08-17T12:00:00.000Z',
    status: 'NEW' as const,
  };

  propCopiaEventBus.publish('intent.created', { intent });
  propCopiaEventBus.publish('intent.updated', {
    intent: { ...intent, status: 'CANCELLED' },
  });

  const record = store.get(intent.intentId);
  assert.ok(record);
  assert.equal(record.intentStatus, 'CANCELLED');
  assert.equal(record.lifecycleStatus, 'CANCELLED');
  assert.equal(record.events[0]?.message, 'Intent moved to CANCELLED');

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
    riskDecisionFingerprint: 'a'.repeat(64),
    riskDecisionEvidence: '{"version":"risk-rules-v1"}',
    riskEvaluatedAt: '2026-08-17T12:00:00.000Z',
    riskRuleVersion: 'risk-rules-v1',
  });

  const record = store.get('rule:fill-2:follower-2');
  assert.ok(record);
  assert.equal(record?.lifecycleStatus, 'RULE_SKIPPED');
  assert.equal(record?.ruleReasonCode, 'SYMBOL_BLOCKED');
  assert.equal(record?.riskDecisionFingerprint, 'a'.repeat(64));
  assert.equal(record?.riskRuleVersion, 'risk-rules-v1');
  assert.equal(record?.riskEvaluatedAt, '2026-08-17T12:00:00.000Z');
  assert.equal(record?.riskDecisionEvidence, '{"version":"risk-rules-v1"}');
  assert.equal(record?.events[0]?.message, 'Rule skipped: Symbol blocked');

  store.stop();
  store.clear();
});

test('tracks rule rejections with user-friendly reason labels', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('rule.rejected', {
    followerAccountId: 'follower-3',
    masterFillId: 'fill-3',
    symbol: 'MNQ',
    reasonCode: 'RISK_LIMIT_BREACHED',
  });

  const record = store.get('rule:fill-3:follower-3');
  assert.ok(record);
  assert.equal(record?.lifecycleStatus, 'RULE_REJECTED');
  assert.equal(record?.ruleReasonCode, 'RISK_LIMIT_BREACHED');
  assert.equal(record?.lastErrorMessage, 'Risk limit breached');
  assert.equal(record?.events[0]?.message, 'Rule rejected: Risk limit breached');

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

test('markRecoveryItemReviewed stores review status, note, and event history', () => {
  const store = new TradeHistoryStore();
  store.start();

  propCopiaEventBus.publish('intent.created', {
    intent: {
      intentId: 'intent-review',
      masterAccountId: 'master-review',
      masterFillId: 'fill-review',
      followerAccountId: 'follower-review',
      symbol: 'ES',
      side: 'BUY',
      quantity: 1,
      createdAt: '2026-08-11T14:00:00.000Z',
      status: 'NEW',
    },
  });
  propCopiaEventBus.publish('execution.failed', {
    intentId: 'intent-review',
    followerAccountId: 'follower-review',
    brokerKey: 'follower-ws:follower-review',
    errorMessage: 'Broker down',
    failedAt: '2026-08-11T14:01:00.000Z',
  });

  const reviewed = store.markRecoveryItemReviewed('intent-review', {
    note: 'Checked broker logs and left for retry review',
    reviewedAt: '2026-08-11T14:05:00.000Z',
  });

  assert.ok(reviewed);
  assert.equal(reviewed.reviewStatus, 'reviewed');
  assert.equal(reviewed.reviewNote, 'Checked broker logs and left for retry review');
  assert.equal(reviewed.reviewedAt, '2026-08-11T14:05:00.000Z');
  assert.equal(reviewed.events[0]?.type, 'review.marked');
  assert.equal(
    reviewed.events[0]?.message,
    'Failure reviewed: Checked broker logs and left for retry review',
  );

  store.stop();
  store.clear();
});
