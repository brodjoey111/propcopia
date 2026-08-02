import test from 'node:test';
import assert from 'node:assert/strict';
import { TradeIntentManager } from './trade-intent-manager';

function createBaseIntentInput() {
  return {
    masterAccountId: 'master-1',
    masterFillId: 'fill-1',
    followerAccountId: 'follower-1',
    symbol: 'ESZ6',
    side: 'BUY' as const,
    quantity: 2,
  };
}

test('createIntent() starts at NEW', () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  assert.equal(typeof intent.intentId, 'string');
  assert.ok(intent.intentId.length > 0);
  assert.equal(intent.status, 'NEW');
  assert.equal(intent.masterAccountId, 'master-1');
  assert.equal(intent.masterFillId, 'fill-1');
  assert.equal(intent.followerAccountId, 'follower-1');
  assert.equal(intent.symbol, 'ESZ6');
  assert.equal(intent.side, 'BUY');
  assert.equal(intent.quantity, 2);
  assert.equal(typeof intent.createdAt, 'string');
});

test('TradeIntentManager supports NEW -> VALIDATED -> READY_TO_SEND -> SENT', () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  assert.equal(manager.markValidated(intent.intentId).status, 'VALIDATED');
  assert.equal(manager.markReadyToSend(intent.intentId).status, 'READY_TO_SEND');
  assert.equal(manager.markSent(intent.intentId).status, 'SENT');
});

test('TradeIntentManager supports SENT -> ACKNOWLEDGED', () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  manager.markValidated(intent.intentId);
  manager.markReadyToSend(intent.intentId);
  manager.markSent(intent.intentId);

  assert.equal(manager.markAcknowledged(intent.intentId).status, 'ACKNOWLEDGED');
});

test('TradeIntentManager supports ACKNOWLEDGED -> FILLED', () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  manager.markValidated(intent.intentId);
  manager.markReadyToSend(intent.intentId);
  manager.markSent(intent.intentId);
  manager.markAcknowledged(intent.intentId);

  assert.equal(manager.markFilled(intent.intentId).status, 'FILLED');
});

test('TradeIntentManager supports SENT -> REJECTED', () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  manager.markValidated(intent.intentId);
  manager.markReadyToSend(intent.intentId);
  manager.markSent(intent.intentId);

  assert.equal(manager.markRejected(intent.intentId).status, 'REJECTED');
});

test('TradeIntentManager throws on invalid transition', () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  assert.throws(() => manager.markSent(intent.intentId), {
    message: 'Invalid trade intent transition: NEW -> SENT',
  });
});

test('TradeIntentManager throws on missing intent', () => {
  const manager = new TradeIntentManager();

  assert.throws(() => manager.markValidated('missing-intent-id'), {
    message: 'Trade intent not found: missing-intent-id',
  });
});

test('TradeIntentManager emits intentCreated event', async () => {
  const manager = new TradeIntentManager();

  const intent = await new Promise<ReturnType<TradeIntentManager['createIntent']>>((resolve) => {
    manager.once('intentCreated', resolve);
    manager.createIntent(createBaseIntentInput());
  });

  assert.equal(intent.status, 'NEW');
  assert.equal(intent.masterFillId, 'fill-1');
});

test('TradeIntentManager emits intentUpdated event', async () => {
  const manager = new TradeIntentManager();
  const intent = manager.createIntent(createBaseIntentInput());

  const updatedIntent = await new Promise((resolve) => {
    manager.once('intentUpdated', resolve);
    manager.markValidated(intent.intentId);
  });

  assert.equal(updatedIntent.status, 'VALIDATED');
  assert.equal(updatedIntent.intentId, intent.intentId);
});
