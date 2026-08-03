import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { BrokerAdapterConnectionState } from './brokers/BrokerAdapter';
import { propCopiaEventBus } from './event-bus';
import { ExecutionManager } from './execution-manager';
import { TradeIntentManager } from './trade-intent-manager';
import type {
  BrokerAccount,
  BrokerOrderRequest,
  BrokerOrderResult,
  BrokerPosition,
  ExecutionContext,
  ExecutionManagerOptions,
  ExecutionStatus,
} from './execution-types';
import type { BrokerAdapter } from './brokers/BrokerAdapter';
import type { ExecutionFailedEvent, ExecutionQueuedEvent, ExecutionSentEvent } from './event-bus-types';
import type { TradeIntent } from './trade-intent-types';

const SHORT_RETRY_DELAY_MS = 10;
const SHORT_TIMEOUT_MS = 15;

type DeferredResult = {
  resolve: (value: BrokerOrderResult) => void;
  reject: (error: Error) => void;
};

class FakeBrokerAdapter implements BrokerAdapter {
  connected = true;
  disconnectCalls = 0;
  submissions: BrokerOrderRequest[] = [];
  private behaviors: Array<(request: BrokerOrderRequest) => Promise<BrokerOrderResult>> = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.disconnectCalls += 1;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionState(): BrokerAdapterConnectionState {
    return {
      connected: this.connected,
      authenticated: this.connected,
      brokerAccountIds: [],
    };
  }

  async submitOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult> {
    this.submissions.push({ ...request });
    const behavior = this.behaviors.shift();

    if (!behavior) {
      throw new Error('No fake broker behavior queued.');
    }

    return behavior(request);
  }

  async cancelOrder(_brokerOrderId: string, _accountId: string): Promise<void> {}

  async getAccounts(): Promise<BrokerAccount[]> {
    return [];
  }

  async getPositions(_accountId?: string): Promise<BrokerPosition[]> {
    return [];
  }

  queueAccepted(overrides: Partial<BrokerOrderResult> = {}): void {
    this.behaviors.push(async (request) => ({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: `broker-order-${request.intentId}-${this.submissions.length}`,
      submittedAt: '2026-08-03T12:00:00.000Z',
      ...overrides,
    }));
  }

  queueRejected(overrides: Partial<BrokerOrderResult> = {}): void {
    this.behaviors.push(async () => ({
      accepted: false,
      status: 'REJECTED',
      errorCode: 'REJECTED_BY_BROKER',
      errorMessage: 'Broker rejected order.',
      submittedAt: '2026-08-03T12:00:00.000Z',
      ...overrides,
    }));
  }

  queueError(message = 'Fake adapter error'): void {
    this.behaviors.push(async () => {
      throw new Error(message);
    });
  }

  queueHang(): void {
    this.behaviors.push(
      async () =>
        await new Promise<BrokerOrderResult>(() => {
          return undefined;
        }),
    );
  }

  queueDeferred(): DeferredResult {
    let resolveResult!: (value: BrokerOrderResult) => void;
    let rejectResult!: (error: Error) => void;

    const promise = new Promise<BrokerOrderResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    this.behaviors.push(async () => promise);

    return {
      resolve: resolveResult,
      reject: rejectResult,
    };
  }
}

function createReadyIntent(manager: TradeIntentManager, suffix: string) {
  const intent = manager.createIntent({
    masterAccountId: `master-${suffix}`,
    masterFillId: `fill-${suffix}`,
    followerAccountId: `follower-${suffix}`,
    symbol: 'ESZ6',
    side: 'BUY',
    quantity: 1,
  });

  manager.markValidated(intent.intentId);
  return manager.markReadyToSend(intent.intentId);
}

function createContext(intent: ReturnType<typeof createReadyIntent>): ExecutionContext {
  return {
    intent,
    brokerKey: 'fake-broker',
    request: {
      accountId: intent.followerAccountId,
      symbol: intent.symbol,
      side: intent.side,
      quantity: intent.quantity,
      orderType: 'MARKET',
      intentId: intent.intentId,
    },
  };
}

function createHarness(options?: ExecutionManagerOptions) {
  propCopiaEventBus.removeAllListeners();

  const tradeIntentManager = new TradeIntentManager();
  const executionManager = new ExecutionManager(tradeIntentManager, options);
  const adapter = new FakeBrokerAdapter();

  executionManager.registerBrokerAdapter('fake-broker', adapter);

  const queuedEvents: ExecutionQueuedEvent[] = [];
  const sentEvents: ExecutionSentEvent[] = [];
  const failedEvents: ExecutionFailedEvent[] = [];

  propCopiaEventBus.subscribe('execution.queued', (event) => {
    queuedEvents.push(event);
  });
  propCopiaEventBus.subscribe('execution.sent', (event) => {
    sentEvents.push(event);
  });
  propCopiaEventBus.subscribe('execution.failed', (event) => {
    failedEvents.push(event);
  });

  return {
    tradeIntentManager,
    executionManager,
    adapter,
    queuedEvents,
    sentEvents,
    failedEvents,
    cleanup() {
      propCopiaEventBus.removeAllListeners();
    },
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 250): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Condition not met within ${timeoutMs}ms`);
    }

    await delay(1);
  }
}

async function waitForStatus(
  executionManager: ExecutionManager,
  intentId: string,
  status: ExecutionStatus,
): Promise<void> {
  await waitFor(() => executionManager.getExecutionState(intentId)?.status === status);
}

async function expectPending<T>(promise: Promise<T>, waitMs = 5): Promise<void> {
  let settled = false;
  void promise.finally(() => {
    settled = true;
  });

  await delay(waitMs);
  assert.equal(settled, false);
}

test('ExecutionManager', { concurrency: false }, async (t) => {
  await t.test('enqueue creates an execution record', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'enqueue-record');

    await harness.executionManager.enqueue(createContext(intent));

    const record = harness.executionManager.getExecutionState(intent.intentId);
    assert.ok(record);
    assert.equal(record.status, 'QUEUED');
    assert.equal(record.intentId, intent.intentId);
    assert.equal(record.attempts, 0);
    assert.equal(record.request.clientOrderId, intent.intentId);
  });

  await t.test('accepted broker result marks execution COMPLETED', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'accepted-completed');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'COMPLETED');
  });

  await t.test('accepted result moves TradeIntent to SENT', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'accepted-sent');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'SENT');
  });

  await t.test('accepted result publishes execution.sent', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueAccepted({ brokerOrderId: 'broker-order-accepted' });
    const intent = createReadyIntent(harness.tradeIntentManager, 'accepted-event');

    await harness.executionManager.enqueue(createContext(intent));
    await waitFor(() => harness.sentEvents.length === 1);

    assert.deepEqual(harness.sentEvents[0], {
      intentId: intent.intentId,
      followerAccountId: intent.followerAccountId,
      brokerKey: 'fake-broker',
      brokerOrderId: 'broker-order-accepted',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
  });

  await t.test('rejected broker result marks execution FAILED', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueRejected();
    const intent = createReadyIntent(harness.tradeIntentManager, 'rejected-failed');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'FAILED');

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'FAILED');
  });

  await t.test('rejected result moves TradeIntent through SENT to REJECTED', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const intent = createReadyIntent(harness.tradeIntentManager, 'rejected-intent-flow');
    const statuses: string[] = [];
    harness.tradeIntentManager.on('intentUpdated', (updatedIntent: TradeIntent) => {
      if (updatedIntent.intentId === intent.intentId) {
        statuses.push(updatedIntent.status);
      }
    });

    harness.adapter.queueRejected();

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'FAILED');

    assert.deepEqual(statuses.slice(-2), ['SENT', 'REJECTED']);
    assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'REJECTED');
  });

  await t.test('rejected result publishes execution.failed', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueRejected({
      errorCode: 'BROKER_REJECT',
      errorMessage: 'Risk check failed',
    });
    const intent = createReadyIntent(harness.tradeIntentManager, 'rejected-event');

    await harness.executionManager.enqueue(createContext(intent));
    await waitFor(() => harness.failedEvents.length === 1);

    assert.equal(harness.failedEvents[0].intentId, intent.intentId);
    assert.equal(harness.failedEvents[0].brokerKey, 'fake-broker');
    assert.equal(harness.failedEvents[0].errorCode, 'BROKER_REJECT');
    assert.equal(harness.failedEvents[0].errorMessage, 'Risk check failed');
  });

  await t.test('missing broker adapter throws before creating an execution', async () => {
    propCopiaEventBus.removeAllListeners();
    t.after(() => propCopiaEventBus.removeAllListeners());

    const tradeIntentManager = new TradeIntentManager();
    const executionManager = new ExecutionManager(tradeIntentManager);
    const intent = createReadyIntent(tradeIntentManager, 'missing-adapter');

    await assert.rejects(() => executionManager.enqueue(createContext(intent)), {
      message: 'Broker adapter not registered: fake-broker',
    });
    assert.equal(executionManager.getAllExecutions().length, 0);
  });

  await t.test('duplicate intent enqueue throws', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'duplicate-enqueue');
    const context = createContext(intent);

    await harness.executionManager.enqueue(context);
    await assert.rejects(() => harness.executionManager.enqueue(context), {
      message: `Execution already exists for intent ${intent.intentId}.`,
    });
  });

  await t.test('pause keeps work queued', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueAccepted();
    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'pause-queued');

    await harness.executionManager.enqueue(createContext(intent));
    await delay(5);

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'QUEUED');
    assert.deepEqual(harness.executionManager.getQueuedExecutions().map((record) => record.intentId), [
      intent.intentId,
    ]);
    assert.equal(harness.adapter.submissions.length, 0);
  });

  await t.test('resume starts queued work', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const deferred = harness.adapter.queueDeferred();
    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'resume-starts');

    await harness.executionManager.enqueue(createContext(intent));
    harness.executionManager.resume();
    await waitFor(() => harness.adapter.submissions.length === 1);

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'RUNNING');

    deferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-resume',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');
  });

  await t.test('FIFO order is preserved', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const firstDeferred = harness.adapter.queueDeferred();
    harness.adapter.queueAccepted({ brokerOrderId: 'broker-order-second' });
    const firstIntent = createReadyIntent(harness.tradeIntentManager, 'fifo-first');
    const secondIntent = createReadyIntent(harness.tradeIntentManager, 'fifo-second');

    await harness.executionManager.enqueue(createContext(firstIntent));
    await harness.executionManager.enqueue(createContext(secondIntent));
    await waitFor(() => harness.adapter.submissions.length === 1);

    firstDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-first',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitFor(() => harness.adapter.submissions.length === 2);
    await waitForStatus(harness.executionManager, firstIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, secondIntent.intentId, 'COMPLETED');

    assert.deepEqual(
      harness.adapter.submissions.map((request) => request.intentId),
      [firstIntent.intentId, secondIntent.intentId],
    );
  });

  await t.test('cancelling a QUEUED execution marks it CANCELLED', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'cancel-queued');

    await harness.executionManager.enqueue(createContext(intent));
    await harness.executionManager.cancel(intent.intentId);

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'CANCELLED');
    assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'CANCELLED');
  });

  await t.test('cancelling a RETRY_WAIT execution clears the retry', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('Retry me once');
    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'cancel-retry-wait');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'RETRY_WAIT');

    await harness.executionManager.cancel(intent.intentId);
    await delay(SHORT_RETRY_DELAY_MS + 10);

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'CANCELLED');
    assert.equal(harness.adapter.submissions.length, 1);
  });

  await t.test('cancelling a RUNNING execution throws', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const deferred = harness.adapter.queueDeferred();
    const intent = createReadyIntent(harness.tradeIntentManager, 'cancel-running');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'RUNNING');

    await assert.rejects(() => harness.executionManager.cancel(intent.intentId), {
      message: `Cannot cancel running execution in Phase 1: ${intent.intentId}`,
    });

    deferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-running',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');
  });

  await t.test('cancelling COMPLETED, FAILED, or CANCELLED execution throws', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueAccepted();
    harness.adapter.queueRejected();
    const completedIntent = createReadyIntent(harness.tradeIntentManager, 'cancel-completed');
    const failedIntent = createReadyIntent(harness.tradeIntentManager, 'cancel-failed');
    const cancelledIntent = createReadyIntent(harness.tradeIntentManager, 'cancel-cancelled');

    harness.executionManager.pause();
    await harness.executionManager.enqueue(createContext(cancelledIntent));
    await harness.executionManager.cancel(cancelledIntent.intentId);
    harness.executionManager.resume();

    await harness.executionManager.enqueue(createContext(completedIntent));
    await harness.executionManager.enqueue(createContext(failedIntent));
    await waitForStatus(harness.executionManager, completedIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, failedIntent.intentId, 'FAILED');

    await assert.rejects(() => harness.executionManager.cancel(completedIntent.intentId), {
      message: `Execution cannot be cancelled from status COMPLETED: ${completedIntent.intentId}`,
    });
    await assert.rejects(() => harness.executionManager.cancel(failedIntent.intentId), {
      message: `Execution cannot be cancelled from status FAILED: ${failedIntent.intentId}`,
    });
    await assert.rejects(() => harness.executionManager.cancel(cancelledIntent.intentId), {
      message: `Execution cannot be cancelled from status CANCELLED: ${cancelledIntent.intentId}`,
    });
  });

  await t.test('kill switch blocks new enqueue calls', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.activateKillSwitch('maintenance');
    const intent = createReadyIntent(harness.tradeIntentManager, 'kill-switch-block');

    await assert.rejects(() => harness.executionManager.enqueue(createContext(intent)), {
      message: 'ExecutionManager kill switch is active: maintenance.',
    });
  });

  await t.test('kill switch cancels QUEUED executions', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'kill-switch-queued');

    await harness.executionManager.enqueue(createContext(intent));
    harness.executionManager.activateKillSwitch('emergency');

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'CANCELLED');
    assert.equal(harness.tradeIntentManager.getIntent(intent.intentId)?.status, 'CANCELLED');
  });

  await t.test('kill switch cancels RETRY_WAIT executions', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('retry then kill');
    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'kill-switch-retry');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'RETRY_WAIT');

    harness.executionManager.activateKillSwitch('emergency');
    await delay(SHORT_RETRY_DELAY_MS + 10);

    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'CANCELLED');
    assert.equal(harness.adapter.submissions.length, 1);
  });

  await t.test('kill switch does not force-cancel RUNNING execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const deferred = harness.adapter.queueDeferred();
    const intent = createReadyIntent(harness.tradeIntentManager, 'kill-switch-running');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'RUNNING');

    harness.executionManager.activateKillSwitch('emergency');
    await delay(5);
    assert.equal(harness.executionManager.getExecutionState(intent.intentId)?.status, 'RUNNING');

    deferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-kill-running',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');
  });

  await t.test('adapter error retries when maxRetries allows it', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('first attempt failed');
    harness.adapter.queueAccepted({ brokerOrderId: 'broker-order-retry-success' });
    const intent = createReadyIntent(harness.tradeIntentManager, 'retry-allows');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    const record = harness.executionManager.getExecutionState(intent.intentId);
    assert.equal(record?.attempts, 2);
    assert.equal(harness.adapter.submissions.length, 2);
  });

  await t.test('retry reuses the same intentId', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('retry intent id');
    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'retry-intent-id');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    assert.equal(harness.adapter.submissions[0].intentId, intent.intentId);
    assert.equal(harness.adapter.submissions[1].intentId, intent.intentId);
  });

  await t.test('retry reuses the same clientOrderId', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('retry client order id');
    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'retry-client-order-id');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    assert.equal(harness.adapter.submissions[0].clientOrderId, intent.intentId);
    assert.equal(harness.adapter.submissions[1].clientOrderId, intent.intentId);
  });

  await t.test('retry does not create a second execution record', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('retry single record');
    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'retry-one-record');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    assert.equal(harness.executionManager.getAllExecutions().length, 1);
  });

  await t.test('timeout fails terminally and does not retry', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueHang();
    harness.adapter.queueAccepted();
    const intent = createReadyIntent(harness.tradeIntentManager, 'timeout-terminal');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 3,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });
    await waitForStatus(harness.executionManager, intent.intentId, 'FAILED');
    await delay(SHORT_RETRY_DELAY_MS + 10);

    const record = harness.executionManager.getExecutionState(intent.intentId);
    assert.equal(record?.status, 'FAILED');
    assert.equal(record?.attempts, 1);
    assert.equal(harness.adapter.submissions.length, 1);
    assert.equal(record?.lastErrorMessage, `Execution timed out after ${SHORT_TIMEOUT_MS}ms`);
  });

  await t.test('unregisterBrokerAdapter disconnects and removes the adapter', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    await harness.executionManager.unregisterBrokerAdapter('fake-broker');

    assert.equal(harness.adapter.disconnectCalls, 1);

    const intent = createReadyIntent(harness.tradeIntentManager, 'unregister-adapter');
    await assert.rejects(() => harness.executionManager.enqueue(createContext(intent)), {
      message: 'Broker adapter not registered: fake-broker',
    });
  });

  await t.test('execution.queued event is published', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'queued-event');

    await harness.executionManager.enqueue(createContext(intent));

    assert.equal(harness.queuedEvents.length, 1);
    assert.equal(harness.queuedEvents[0].intentId, intent.intentId);
    assert.equal(harness.queuedEvents[0].followerAccountId, intent.followerAccountId);
    assert.equal(harness.queuedEvents[0].brokerKey, 'fake-broker');
  });

  await t.test('waitForExecution resolves immediately for already COMPLETED execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueAccepted({ brokerOrderId: 'broker-order-immediate-completed' });
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-immediate-completed');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'COMPLETED');

    const result = await harness.executionManager.waitForExecution(intent.intentId);

    assert.equal(result.intentId, intent.intentId);
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.success, true);
    assert.equal(result.brokerResult?.brokerOrderId, 'broker-order-immediate-completed');
    assert.ok(result.elapsedMs >= 0);
  });

  await t.test('waitForExecution resolves immediately for already FAILED execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueRejected({
      errorCode: 'BROKER_REJECT',
      errorMessage: 'Rejected immediately',
    });
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-immediate-failed');

    await harness.executionManager.enqueue(createContext(intent));
    await waitForStatus(harness.executionManager, intent.intentId, 'FAILED');

    const result = await harness.executionManager.waitForExecution(intent.intentId);

    assert.equal(result.intentId, intent.intentId);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.success, false);
    assert.equal(result.errorCode, 'BROKER_REJECT');
    assert.equal(result.errorMessage, 'Rejected immediately');
    assert.ok(result.elapsedMs >= 0);
  });

  await t.test('waitForExecution resolves immediately for already CANCELLED execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-immediate-cancelled');

    await harness.executionManager.enqueue(createContext(intent));
    await harness.executionManager.cancel(intent.intentId);

    const result = await harness.executionManager.waitForExecution(intent.intentId);

    assert.equal(result.intentId, intent.intentId);
    assert.equal(result.status, 'CANCELLED');
    assert.equal(result.success, false);
    assert.ok(result.elapsedMs >= 0);
  });

  await t.test('waitForExecution waits through COMPLETED execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const deferred = harness.adapter.queueDeferred();
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-completed');

    await harness.executionManager.enqueue(createContext(intent));
    const waitPromise = harness.executionManager.waitForExecution(intent.intentId);
    await expectPending(waitPromise);

    deferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-wait-completed',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    const result = await waitPromise;
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.success, true);
    assert.equal(result.brokerResult?.brokerOrderId, 'broker-order-wait-completed');
    assert.ok(result.elapsedMs >= 0);
  });

  await t.test('waitForExecution waits through FAILED execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const deferred = harness.adapter.queueDeferred();
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-failed');

    await harness.executionManager.enqueue(createContext(intent));
    const waitPromise = harness.executionManager.waitForExecution(intent.intentId);
    await expectPending(waitPromise);

    deferred.resolve({
      accepted: false,
      status: 'REJECTED',
      errorCode: 'BROKER_REJECT',
      errorMessage: 'Deferred reject',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    const result = await waitPromise;
    assert.equal(result.status, 'FAILED');
    assert.equal(result.success, false);
    assert.equal(result.errorCode, 'BROKER_REJECT');
    assert.equal(result.errorMessage, 'Deferred reject');
    assert.equal(result.brokerResult?.accepted, false);
    assert.ok(result.elapsedMs >= 0);
  });

  await t.test('waitForExecution waits through CANCELLED execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-cancelled');

    await harness.executionManager.enqueue(createContext(intent));
    const waitPromise = harness.executionManager.waitForExecution(intent.intentId);
    await expectPending(waitPromise);

    await harness.executionManager.cancel(intent.intentId);

    const result = await waitPromise;
    assert.equal(result.status, 'CANCELLED');
    assert.equal(result.success, false);
    assert.ok(result.elapsedMs >= 0);
  });

  await t.test('waitForExecution waits through RETRY_WAIT until success', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueError('retry before success');
    harness.adapter.queueAccepted({ brokerOrderId: 'broker-order-retry-wait' });
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-retry-success');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });

    const waitPromise = harness.executionManager.waitForExecution(intent.intentId);
    await waitForStatus(harness.executionManager, intent.intentId, 'RETRY_WAIT');
    const result = await waitPromise;
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.success, true);
    assert.equal(result.brokerResult?.brokerOrderId, 'broker-order-retry-wait');
  });

  await t.test('waitForExecution resolves after timeout failure', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.adapter.queueHang();
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-timeout');

    await harness.executionManager.enqueue({
      ...createContext(intent),
      retryPolicy: {
        maxRetries: 2,
        retryDelayMs: SHORT_RETRY_DELAY_MS,
        timeoutMs: SHORT_TIMEOUT_MS,
      },
    });

    const result = await harness.executionManager.waitForExecution(intent.intentId);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.success, false);
    assert.equal(result.errorMessage, `Execution timed out after ${SHORT_TIMEOUT_MS}ms`);
  });

  await t.test('waitForExecution resolves when kill switch cancels a queued execution', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    harness.executionManager.pause();
    const intent = createReadyIntent(harness.tradeIntentManager, 'wait-kill-switch');

    await harness.executionManager.enqueue(createContext(intent));
    const waitPromise = harness.executionManager.waitForExecution(intent.intentId);
    await expectPending(waitPromise);

    harness.executionManager.activateKillSwitch('emergency');

    const result = await waitPromise;
    assert.equal(result.status, 'CANCELLED');
    assert.equal(result.success, false);
  });

  await t.test('waitForExecution rejects for unknown intent', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    await assert.rejects(() => harness.executionManager.waitForExecution('missing-intent-id'), {
      message: 'Execution not found for intent missing-intent-id.',
    });
  });

  await t.test('default maxConcurrency is 1', async () => {
    const harness = createHarness();
    t.after(harness.cleanup);

    const firstDeferred = harness.adapter.queueDeferred();
    const secondDeferred = harness.adapter.queueDeferred();
    const firstIntent = createReadyIntent(harness.tradeIntentManager, 'default-concurrency-first');
    const secondIntent = createReadyIntent(harness.tradeIntentManager, 'default-concurrency-second');

    await harness.executionManager.enqueue(createContext(firstIntent));
    await harness.executionManager.enqueue(createContext(secondIntent));
    await waitFor(() => harness.adapter.submissions.length === 1);
    await delay(5);

    assert.deepEqual(harness.adapter.submissions.map((request) => request.intentId), [
      firstIntent.intentId,
    ]);

    firstDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-default-first',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitFor(() => harness.adapter.submissions.length === 2);

    secondDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-default-second',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitForStatus(harness.executionManager, firstIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, secondIntent.intentId, 'COMPLETED');
  });

  await t.test('configurable concurrency greater than 1 starts multiple executions', async () => {
    const harness = createHarness({ maxConcurrency: 2 });
    t.after(harness.cleanup);

    const firstDeferred = harness.adapter.queueDeferred();
    const secondDeferred = harness.adapter.queueDeferred();
    const thirdDeferred = harness.adapter.queueDeferred();
    const firstIntent = createReadyIntent(harness.tradeIntentManager, 'config-concurrency-first');
    const secondIntent = createReadyIntent(harness.tradeIntentManager, 'config-concurrency-second');
    const thirdIntent = createReadyIntent(harness.tradeIntentManager, 'config-concurrency-third');

    await harness.executionManager.enqueue(createContext(firstIntent));
    await harness.executionManager.enqueue(createContext(secondIntent));
    await harness.executionManager.enqueue(createContext(thirdIntent));
    await waitFor(() => harness.adapter.submissions.length === 2);
    await delay(5);

    assert.deepEqual(harness.adapter.submissions.map((request) => request.intentId), [
      firstIntent.intentId,
      secondIntent.intentId,
    ]);

    firstDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-config-first',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
    secondDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-config-second',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitFor(() => harness.adapter.submissions.length === 3);

    thirdDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-config-third',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitForStatus(harness.executionManager, firstIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, secondIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, thirdIntent.intentId, 'COMPLETED');
  });

  await t.test('FIFO start order is preserved with bounded concurrency', async () => {
    const harness = createHarness({ maxConcurrency: 2 });
    t.after(harness.cleanup);

    const firstDeferred = harness.adapter.queueDeferred();
    const secondDeferred = harness.adapter.queueDeferred();
    const thirdDeferred = harness.adapter.queueDeferred();
    const firstIntent = createReadyIntent(harness.tradeIntentManager, 'fifo-bounded-first');
    const secondIntent = createReadyIntent(harness.tradeIntentManager, 'fifo-bounded-second');
    const thirdIntent = createReadyIntent(harness.tradeIntentManager, 'fifo-bounded-third');

    await harness.executionManager.enqueue(createContext(firstIntent));
    await harness.executionManager.enqueue(createContext(secondIntent));
    await harness.executionManager.enqueue(createContext(thirdIntent));
    await waitFor(() => harness.adapter.submissions.length === 2);

    assert.deepEqual(harness.adapter.submissions.map((request) => request.intentId), [
      firstIntent.intentId,
      secondIntent.intentId,
    ]);

    secondDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-fifo-second',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitFor(() => harness.adapter.submissions.length === 3);

    assert.deepEqual(harness.adapter.submissions.map((request) => request.intentId), [
      firstIntent.intentId,
      secondIntent.intentId,
      thirdIntent.intentId,
    ]);

    firstDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-fifo-first',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
    thirdDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-fifo-third',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitForStatus(harness.executionManager, firstIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, secondIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, thirdIntent.intentId, 'COMPLETED');
  });

  await t.test('next queued execution starts when a slot becomes available', async () => {
    const harness = createHarness({ maxConcurrency: 2 });
    t.after(harness.cleanup);

    const firstDeferred = harness.adapter.queueDeferred();
    const secondDeferred = harness.adapter.queueDeferred();
    const thirdDeferred = harness.adapter.queueDeferred();
    const firstIntent = createReadyIntent(harness.tradeIntentManager, 'slot-first');
    const secondIntent = createReadyIntent(harness.tradeIntentManager, 'slot-second');
    const thirdIntent = createReadyIntent(harness.tradeIntentManager, 'slot-third');

    await harness.executionManager.enqueue(createContext(firstIntent));
    await harness.executionManager.enqueue(createContext(secondIntent));
    await harness.executionManager.enqueue(createContext(thirdIntent));
    await waitFor(() => harness.adapter.submissions.length === 2);
    await delay(5);

    assert.equal(harness.executionManager.getExecutionState(thirdIntent.intentId)?.status, 'QUEUED');

    firstDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-slot-first',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitFor(() => harness.adapter.submissions.length === 3);

    secondDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-slot-second',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });
    thirdDeferred.resolve({
      accepted: true,
      status: 'ACCEPTED',
      brokerOrderId: 'broker-order-slot-third',
      submittedAt: '2026-08-03T12:00:00.000Z',
    });

    await waitForStatus(harness.executionManager, firstIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, secondIntent.intentId, 'COMPLETED');
    await waitForStatus(harness.executionManager, thirdIntent.intentId, 'COMPLETED');
  });
});
