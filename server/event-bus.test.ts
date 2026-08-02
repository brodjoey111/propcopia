import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, propCopiaEventBus } from './event-bus';
import type { PropCopiaEventMap } from './event-bus-types';

test('subscribe receives the published payload', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  const payload = {
    masterAccountId: 'master-1',
    fillId: 'fill-1',
    symbol: 'ES',
    side: 'BUY' as const,
    quantity: 2,
    price: 5500.25,
    timestamp: '2026-08-02T14:00:00.000Z',
  };

  let received: typeof payload | undefined;

  bus.subscribe('trade.master_fill_received', (event) => {
    received = event;
  });

  bus.publish('trade.master_fill_received', payload);

  assert.equal(received, payload);
});

test('multiple subscribers receive the same event', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  const calls: string[] = [];

  bus.subscribe('execution.failed', () => {
    calls.push('first');
  });
  bus.subscribe('execution.failed', () => {
    calls.push('second');
  });

  bus.publish('execution.failed', {
    intentId: 'intent-1',
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    brokerKey: 'tradovate:follower-1',
    errorMessage: 'send failed',
    failedAt: '2026-08-02T14:00:00.000Z',
  });

  assert.deepEqual(calls, ['first', 'second']);
});

test('unsubscribe removes only the specified handler', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  const calls: string[] = [];

  const handlerA = () => {
    calls.push('a');
  };
  const handlerB = () => {
    calls.push('b');
  };

  bus.subscribe('rule.allowed', handlerA);
  bus.subscribe('rule.allowed', handlerB);
  bus.unsubscribe('rule.allowed', handlerA);

  bus.publish('rule.allowed', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 1,
  });

  assert.deepEqual(calls, ['b']);
});

test('once runs exactly one time', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  let count = 0;

  bus.once('rule.skipped', () => {
    count += 1;
  });

  bus.publish('rule.skipped', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    reasonCode: 'FOLLOWER_DISABLED',
  });
  bus.publish('rule.skipped', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-2',
    symbol: 'NQ',
    reasonCode: 'SYMBOL_BLOCKED',
  });

  assert.equal(count, 1);
});

test('removeAllListeners(eventName) removes listeners for only that event', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  const calls: string[] = [];

  bus.subscribe('rule.allowed', () => {
    calls.push('allowed');
  });
  bus.subscribe('rule.skipped', () => {
    calls.push('skipped');
  });

  bus.removeAllListeners('rule.allowed');

  bus.publish('rule.allowed', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 1,
  });
  bus.publish('rule.skipped', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    reasonCode: 'FOLLOWER_DISABLED',
  });

  assert.deepEqual(calls, ['skipped']);
});

test('removeAllListeners() removes listeners for every event', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  let count = 0;

  bus.subscribe('rule.allowed', () => {
    count += 1;
  });
  bus.subscribe('rule.rejected', () => {
    count += 1;
  });

  bus.removeAllListeners();

  bus.publish('rule.allowed', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 1,
  });
  bus.publish('rule.rejected', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    reasonCode: 'INVALID_MULTIPLIER',
  });

  assert.equal(count, 0);
});

test('publishing an event with no listeners does not throw', () => {
  const bus = new EventBus<PropCopiaEventMap>();

  assert.doesNotThrow(() => {
    bus.publish('intent.created', {
      intent: {
        intentId: 'intent-1',
        masterAccountId: 'master-1',
        masterFillId: 'fill-1',
        followerAccountId: 'follower-1',
        symbol: 'ES',
        side: 'BUY',
        quantity: 2,
        createdAt: '2026-08-02T14:00:00.000Z',
        status: 'NEW',
      },
    });
  });
});

test('different event names do not trigger each other', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  let allowedCount = 0;
  let rejectedCount = 0;

  bus.subscribe('rule.allowed', () => {
    allowedCount += 1;
  });
  bus.subscribe('rule.rejected', () => {
    rejectedCount += 1;
  });

  bus.publish('rule.allowed', {
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    masterFillId: 'fill-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 1,
  });

  assert.equal(allowedCount, 1);
  assert.equal(rejectedCount, 0);
});

test('propCopiaEventBus singleton can publish and subscribe', () => {
  propCopiaEventBus.removeAllListeners();

  let received = false;

  const handler = () => {
    received = true;
  };

  propCopiaEventBus.subscribe('copy_group.paused', handler);
  propCopiaEventBus.publish('copy_group.paused', {
    group: {
      groupId: 'group-1',
      userId: 'user-1',
      name: 'Main Group',
      masterAccountId: 'master-1',
      followerAccountIds: ['follower-1'],
      groupSettings: { enabled: true },
      riskSettings: { onRiskBreach: 'PAUSE' },
      executionSettings: {
        mode: 'LIVE',
        maxRetries: 0,
        retryDelayMs: 1000,
        orderTimeoutMs: 5000,
        flattenOnEmergencyStop: false,
      },
      createdAt: '2026-08-02T14:00:00.000Z',
      updatedAt: '2026-08-02T14:00:00.000Z',
    },
    runtime: {
      groupId: 'group-1',
      status: 'PAUSED',
      pausedAt: '2026-08-02T14:00:00.000Z',
      isKillSwitchActive: false,
      masterConnected: true,
      connectedFollowerCount: 1,
      totalFollowerCount: 1,
    },
    pausedAt: '2026-08-02T14:00:00.000Z',
  });

  assert.equal(received, true);
  propCopiaEventBus.unsubscribe('copy_group.paused', handler);
  propCopiaEventBus.removeAllListeners();
});

test('payload object is delivered unchanged to the handler', () => {
  const bus = new EventBus<PropCopiaEventMap>();
  const payload = {
    intentId: 'intent-1',
    groupId: 'group-1',
    followerAccountId: 'follower-1',
    brokerKey: 'tradovate:follower-1',
    brokerOrderId: 'broker-order-1',
    submittedAt: '2026-08-02T14:00:00.000Z',
  };

  let received: typeof payload | undefined;

  bus.subscribe('execution.sent', (event) => {
    received = event;
  });

  bus.publish('execution.sent', payload);

  assert.equal(received, payload);
});
