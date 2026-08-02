import { propCopiaEventBus } from './event-bus';
import { TradeIntentManager } from './trade-intent-manager';
import type {
  BrokerAdapter,
  BrokerOrderRequest,
  BrokerOrderResult,
  ExecutionContext,
  ExecutionRecord,
  RetryPolicy,
} from './execution-types';

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 0,
  retryDelayMs: 1000,
  timeoutMs: 5000,
};

class ExecutionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Execution timed out after ${timeoutMs}ms`);
    this.name = 'ExecutionTimeoutError';
  }
}

export class ExecutionManager {
  private adapters = new Map<string, BrokerAdapter>();
  private executions = new Map<string, ExecutionRecord>();
  private queue: string[] = [];
  private retryTimers = new Map<string, NodeJS.Timeout>();
  private paused = false;
  private killSwitchActive = false;
  private killSwitchReason?: string;
  private activeExecutionIntentId: string | null = null;

  constructor(private tradeIntentManager: TradeIntentManager) {}

  registerBrokerAdapter(brokerKey: string, adapter: BrokerAdapter): void {
    this.adapters.set(brokerKey, adapter);
  }

  async unregisterBrokerAdapter(brokerKey: string): Promise<void> {
    const adapter = this.adapters.get(brokerKey);
    if (!adapter) {
      return;
    }

    await adapter.disconnect();
    this.adapters.delete(brokerKey);
  }

  async enqueue(context: ExecutionContext): Promise<void> {
    if (this.killSwitchActive) {
      throw new Error(
        `ExecutionManager kill switch is active${this.killSwitchReason ? `: ${this.killSwitchReason}` : ''}.`,
      );
    }

    if (this.executions.has(context.intent.intentId)) {
      throw new Error(`Execution already exists for intent ${context.intent.intentId}.`);
    }

    if (!this.adapters.has(context.brokerKey)) {
      throw new Error(`Broker adapter not registered: ${context.brokerKey}`);
    }

    const now = new Date().toISOString();
    const retryPolicy = this.resolveRetryPolicy(context.retryPolicy);
    const request: BrokerOrderRequest = {
      ...context.request,
      intentId: context.intent.intentId,
      clientOrderId: context.request.clientOrderId ?? context.intent.intentId,
    };

    const record: ExecutionRecord = {
      intentId: context.intent.intentId,
      brokerKey: context.brokerKey,
      intent: context.intent,
      request,
      retryPolicy,
      status: 'QUEUED',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      queuedAt: now,
    };

    this.executions.set(record.intentId, record);
    this.queue.push(record.intentId);

    propCopiaEventBus.publish('execution.queued', {
      intentId: record.intentId,
      followerAccountId: record.intent.followerAccountId,
      brokerKey: record.brokerKey,
      queuedAt: record.queuedAt,
    });

    this.processQueue();
  }

  async cancel(intentId: string): Promise<void> {
    const record = this.executions.get(intentId);

    if (!record) {
      throw new Error(`Execution not found for intent ${intentId}.`);
    }

    if (record.status === 'RUNNING') {
      throw new Error(`Cannot cancel running execution in Phase 1: ${intentId}`);
    }

    if (
      record.status === 'COMPLETED' ||
      record.status === 'FAILED' ||
      record.status === 'CANCELLED'
    ) {
      throw new Error(`Execution cannot be cancelled from status ${record.status}: ${intentId}`);
    }

    if (record.status === 'RETRY_WAIT') {
      const timer = this.retryTimers.get(intentId);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(intentId);
      }
    }

    this.removeFromQueue(intentId);
    this.markCancelled(record);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.processQueue();
  }

  isPaused(): boolean {
    return this.paused;
  }

  activateKillSwitch(reason?: string): void {
    this.killSwitchActive = true;
    this.killSwitchReason = reason;

    for (const intentId of [...this.queue]) {
      const record = this.executions.get(intentId);
      if (!record || record.status !== 'QUEUED') {
        continue;
      }

      this.removeFromQueue(intentId);
      this.markCancelled(record);
    }

    for (const [intentId, timer] of Array.from(this.retryTimers.entries())) {
      clearTimeout(timer);
      this.retryTimers.delete(intentId);

      const record = this.executions.get(intentId);
      if (!record || record.status !== 'RETRY_WAIT') {
        continue;
      }

      this.markCancelled(record);
    }
  }

  deactivateKillSwitch(): void {
    this.killSwitchActive = false;
    this.killSwitchReason = undefined;
  }

  isKillSwitchActive(): boolean {
    return this.killSwitchActive;
  }

  getExecutionState(intentId: string): ExecutionRecord | undefined {
    return this.executions.get(intentId);
  }

  getQueuedExecutions(): ExecutionRecord[] {
    return this.queue
      .map((intentId) => this.executions.get(intentId))
      .filter((record): record is ExecutionRecord => record !== undefined);
  }

  getAllExecutions(): ExecutionRecord[] {
    return Array.from(this.executions.values());
  }

  private resolveRetryPolicy(policy?: Partial<RetryPolicy>): RetryPolicy {
    return {
      maxRetries: policy?.maxRetries ?? DEFAULT_RETRY_POLICY.maxRetries,
      retryDelayMs: policy?.retryDelayMs ?? DEFAULT_RETRY_POLICY.retryDelayMs,
      timeoutMs: policy?.timeoutMs ?? DEFAULT_RETRY_POLICY.timeoutMs,
    };
  }

  private processQueue(): void {
    if (this.paused || this.killSwitchActive || this.activeExecutionIntentId !== null) {
      return;
    }

    const nextIntentId = this.queue.shift();
    if (!nextIntentId) {
      return;
    }

    const record = this.executions.get(nextIntentId);
    if (!record || record.status !== 'QUEUED') {
      this.processQueue();
      return;
    }

    this.activeExecutionIntentId = nextIntentId;

    void this.runExecution(record).finally(() => {
      if (this.activeExecutionIntentId === nextIntentId) {
        this.activeExecutionIntentId = null;
      }
      this.processQueue();
    });
  }

  private async runExecution(record: ExecutionRecord): Promise<void> {
    const now = new Date().toISOString();
    record.status = 'RUNNING';
    record.attempts += 1;
    record.startedAt = now;
    record.updatedAt = now;
    record.nextRetryAt = undefined;

    const adapter = this.adapters.get(record.brokerKey);
    if (!adapter) {
      this.failRecord(record, 'Broker adapter not registered.');
      return;
    }

    try {
      if (!adapter.isConnected()) {
        throw new Error(`Broker adapter is not connected: ${record.brokerKey}`);
      }

      const result = await this.withTimeout(
        adapter.submitOrder(record.request),
        record.retryPolicy.timeoutMs,
      );

      if (result.accepted) {
        this.completeRecord(record, result);
        return;
      }

      this.rejectRecord(record, result);
    } catch (error) {
      if (error instanceof ExecutionTimeoutError) {
        this.failRecord(record, error.message);
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = record.attempts <= record.retryPolicy.maxRetries;

      if (shouldRetry) {
        this.scheduleRetry(record, message);
        return;
      }

      this.failRecord(record, message);
    }
  }

  private completeRecord(record: ExecutionRecord, result: BrokerOrderResult): void {
    this.tradeIntentManager.markSent(record.intentId);

    record.status = 'COMPLETED';
    record.brokerOrderId = result.brokerOrderId;
    record.lastResult = result;
    record.updatedAt = new Date().toISOString();
    record.completedAt = record.updatedAt;
    record.lastErrorCode = undefined;
    record.lastErrorMessage = undefined;

    propCopiaEventBus.publish('execution.sent', {
      intentId: record.intentId,
      followerAccountId: record.intent.followerAccountId,
      brokerKey: record.brokerKey,
      brokerOrderId: result.brokerOrderId,
      submittedAt: result.submittedAt,
    });
  }

  private rejectRecord(record: ExecutionRecord, result: BrokerOrderResult): void {
    this.tradeIntentManager.markSent(record.intentId);
    this.tradeIntentManager.markRejected(record.intentId);

    record.status = 'FAILED';
    record.lastResult = result;
    record.lastErrorCode = result.errorCode;
    record.lastErrorMessage = result.errorMessage ?? 'Broker rejected order.';
    record.updatedAt = new Date().toISOString();
    record.failedAt = record.updatedAt;

    propCopiaEventBus.publish('execution.failed', {
      intentId: record.intentId,
      followerAccountId: record.intent.followerAccountId,
      brokerKey: record.brokerKey,
      errorCode: record.lastErrorCode,
      errorMessage: record.lastErrorMessage,
      failedAt: record.failedAt,
    });
  }

  private failRecord(record: ExecutionRecord, errorMessage: string, errorCode?: string): void {
    this.tradeIntentManager.markFailed(record.intentId);

    record.status = 'FAILED';
    record.lastErrorCode = errorCode;
    record.lastErrorMessage = errorMessage;
    record.updatedAt = new Date().toISOString();
    record.failedAt = record.updatedAt;

    propCopiaEventBus.publish('execution.failed', {
      intentId: record.intentId,
      followerAccountId: record.intent.followerAccountId,
      brokerKey: record.brokerKey,
      errorCode,
      errorMessage,
      failedAt: record.failedAt,
    });
  }

  private scheduleRetry(record: ExecutionRecord, errorMessage: string): void {
    record.status = 'RETRY_WAIT';
    record.lastErrorMessage = errorMessage;
    record.updatedAt = new Date().toISOString();
    record.nextRetryAt = new Date(
      Date.now() + record.retryPolicy.retryDelayMs,
    ).toISOString();

    const timer = setTimeout(() => {
      this.retryTimers.delete(record.intentId);

      if (record.status !== 'RETRY_WAIT') {
        return;
      }

      record.status = 'QUEUED';
      record.updatedAt = new Date().toISOString();
      record.nextRetryAt = undefined;
      this.queue.unshift(record.intentId);
      this.processQueue();
    }, record.retryPolicy.retryDelayMs);

    this.retryTimers.set(record.intentId, timer);
  }

  private markCancelled(record: ExecutionRecord): void {
    record.status = 'CANCELLED';
    record.updatedAt = new Date().toISOString();
    record.cancelledAt = record.updatedAt;
    record.nextRetryAt = undefined;
    this.tradeIntentManager.markCancelled(record.intentId);
  }

  private removeFromQueue(intentId: string): void {
    this.queue = this.queue.filter((queuedIntentId) => queuedIntentId !== intentId);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            reject(new ExecutionTimeoutError(timeoutMs));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
