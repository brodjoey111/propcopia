import { propCopiaEventBus } from './event-bus';
import type { EventHandler } from './event-bus';
import type { PropCopiaEventMap } from './event-bus-types';
import type { TradeIntentStatus } from './trade-intent-types';
import { formatRuleReasonLabel } from './rule-reason-label';

export type TradeHistoryLifecycleStatus =
  | 'RULE_SKIPPED'
  | 'RULE_REJECTED'
  | 'INTENT_CREATED'
  | 'QUEUED'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'FAILED'
  | 'CANCELLED';

export interface TradeHistoryEvent {
  type: string;
  timestamp: string;
  message: string;
}

export interface TradeHistoryRecord {
  historyId: string;
  intentId?: string;
  masterAccountId?: string;
  masterFillId: string;
  followerAccountId: string;
  symbol: string;
  side?: string;
  quantity?: number;
  intentStatus?: TradeIntentStatus;
  lifecycleStatus: TradeHistoryLifecycleStatus;
  ruleDecision?: 'ALLOWED' | 'SKIPPED' | 'REJECTED';
  ruleReasonCode?: string;
  riskDecisionFingerprint?: string;
  riskDecisionEvidence?: string;
  riskEvaluatedAt?: string;
  riskRuleVersion?: string;
  brokerKey?: string;
  brokerOrderId?: string;
  fillId?: string;
  partialFillCount?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  averageFillPrice?: number;
  createdAt: string;
  updatedAt: string;
  queuedAt?: string;
  sentAt?: string;
  acknowledgedAt?: string;
  filledAt?: string;
  failedAt?: string;
  lastErrorMessage?: string;
  reviewStatus?: 'pending' | 'reviewed';
  reviewNote?: string;
  reviewedAt?: string;
  events: TradeHistoryEvent[];
}

export interface TradeHistoryFilter {
  accountIds?: string[];
  limit?: number;
  statuses?: TradeHistoryLifecycleStatus[];
  query?: string;
}

function buildRuleHistoryId(masterFillId: string, followerAccountId: string): string {
  return `rule:${masterFillId}:${followerAccountId}`;
}

export class TradeHistoryStore {
  private records = new Map<string, TradeHistoryRecord>();
  private started = false;
  private subscriptions: Array<() => void> = [];

  start(): void {
    if (this.started) {
      return;
    }

    this.subscribe('rule.skipped', (event) => {
      const historyId = buildRuleHistoryId(event.masterFillId, event.followerAccountId);
      const reasonLabel = formatRuleReasonLabel(event.reasonCode);
      this.upsert(historyId, {
        historyId,
        masterFillId: event.masterFillId,
        followerAccountId: event.followerAccountId,
        symbol: event.symbol,
        lifecycleStatus: 'RULE_SKIPPED',
        ruleDecision: 'SKIPPED',
        ruleReasonCode: event.reasonCode,
        riskDecisionFingerprint: event.riskDecisionFingerprint,
        riskDecisionEvidence: event.riskDecisionEvidence,
        riskEvaluatedAt: event.riskEvaluatedAt,
        riskRuleVersion: event.riskRuleVersion,
      }, {
        type: 'rule.skipped',
        timestamp: new Date().toISOString(),
        message: `Rule skipped: ${reasonLabel}`,
      });
    });

    this.subscribe('rule.rejected', (event) => {
      const historyId = buildRuleHistoryId(event.masterFillId, event.followerAccountId);
      const reasonLabel = formatRuleReasonLabel(event.reasonCode);
      this.upsert(historyId, {
        historyId,
        masterFillId: event.masterFillId,
        followerAccountId: event.followerAccountId,
        symbol: event.symbol,
        lifecycleStatus: 'RULE_REJECTED',
        ruleDecision: 'REJECTED',
        ruleReasonCode: event.reasonCode,
        riskDecisionFingerprint: event.riskDecisionFingerprint,
        riskDecisionEvidence: event.riskDecisionEvidence,
        riskEvaluatedAt: event.riskEvaluatedAt,
        riskRuleVersion: event.riskRuleVersion,
        lastErrorMessage: reasonLabel,
      }, {
        type: 'rule.rejected',
        timestamp: new Date().toISOString(),
        message: `Rule rejected: ${reasonLabel}`,
      });
    });

    this.subscribe('intent.created', (event) => {
      const intent = event.intent;
      this.upsert(intent.intentId, {
        historyId: intent.intentId,
        intentId: intent.intentId,
        masterAccountId: intent.masterAccountId,
        masterFillId: intent.masterFillId,
        followerAccountId: intent.followerAccountId,
        symbol: intent.symbol,
        side: intent.side,
        quantity: intent.quantity,
        riskDecisionFingerprint: intent.riskDecisionFingerprint,
        riskDecisionEvidence: intent.riskDecisionEvidence,
        riskEvaluatedAt: intent.riskEvaluatedAt,
        riskRuleVersion: intent.riskRuleVersion,
        intentStatus: intent.status,
        lifecycleStatus: 'INTENT_CREATED',
      }, {
        type: 'intent.created',
        timestamp: intent.createdAt,
        message: 'Trade intent created',
      });
    });

    this.subscribe('intent.updated', (event) => {
      const intent = event.intent;
      this.upsert(intent.intentId, {
        historyId: intent.intentId,
        intentId: intent.intentId,
        masterAccountId: intent.masterAccountId,
        masterFillId: intent.masterFillId,
        followerAccountId: intent.followerAccountId,
        symbol: intent.symbol,
        side: intent.side,
        quantity: intent.quantity,
        riskDecisionFingerprint: intent.riskDecisionFingerprint,
        riskDecisionEvidence: intent.riskDecisionEvidence,
        riskEvaluatedAt: intent.riskEvaluatedAt,
        riskRuleVersion: intent.riskRuleVersion,
        intentStatus: intent.status,
        lifecycleStatus: this.mapIntentStatus(intent.status),
      }, {
        type: 'intent.updated',
        timestamp: new Date().toISOString(),
        message: `Intent moved to ${intent.status}`,
      });
    });

    this.subscribe('execution.queued', (event) => {
      this.patchIntentRecord(event.intentId, {
        brokerKey: event.brokerKey,
        queuedAt: event.queuedAt,
        lifecycleStatus: 'QUEUED',
      }, {
        type: 'execution.queued',
        timestamp: event.queuedAt,
        message: 'Execution queued',
      });
    });

    this.subscribe('execution.sent', (event) => {
      this.patchIntentRecord(event.intentId, {
        brokerKey: event.brokerKey,
        brokerOrderId: event.brokerOrderId,
        sentAt: event.submittedAt,
        lifecycleStatus: 'SENT',
      }, {
        type: 'execution.sent',
        timestamp: event.submittedAt,
        message: 'Execution sent to broker',
      });
    });

    this.subscribe('execution.failed', (event) => {
      this.patchIntentRecord(event.intentId, {
        brokerKey: event.brokerKey,
        failedAt: event.failedAt,
        lifecycleStatus: 'FAILED',
        lastErrorMessage: event.errorMessage,
      }, {
        type: 'execution.failed',
        timestamp: event.failedAt,
        message: event.errorMessage,
      });
    });

    this.subscribe('execution.acknowledged', (event) => {
      this.patchIntentRecord(event.intentId, {
        brokerKey: event.brokerKey,
        brokerOrderId: event.brokerOrderId,
        acknowledgedAt: event.acknowledgedAt,
        lifecycleStatus: 'ACKNOWLEDGED',
      }, {
        type: 'execution.acknowledged',
        timestamp: event.acknowledgedAt,
        message: event.brokerStatus
          ? `Broker acknowledged order (${event.brokerStatus})`
          : 'Broker acknowledged order',
      });
    });

    this.subscribe('execution.partial_fill', (event) => {
      const existing = this.records.get(event.intentId);
      const cumulativeFilledQuantity = event.cumulativeFilledQuantity ?? event.filledQuantity;
      this.patchIntentRecord(event.intentId, {
        brokerKey: event.brokerKey,
        brokerOrderId: event.brokerOrderId,
        fillId: event.fillId,
        filledQuantity: cumulativeFilledQuantity,
        remainingQuantity: event.remainingQuantity,
        partialFillCount: (existing?.partialFillCount ?? 0) + 1,
        averageFillPrice: event.averageFillPrice,
        lifecycleStatus: 'PARTIALLY_FILLED',
      }, {
        type: 'execution.partial_fill',
        timestamp: event.filledAt,
        message:
          typeof cumulativeFilledQuantity === 'number'
            ? `Partial fill recorded (${cumulativeFilledQuantity}${typeof existing?.quantity === 'number' ? `/${existing.quantity}` : ''})`
            : 'Partial fill recorded',
      });
    });

    this.subscribe('execution.filled', (event) => {
      this.patchIntentRecord(event.intentId, {
        brokerKey: event.brokerKey,
        brokerOrderId: event.brokerOrderId,
        fillId: event.fillId,
        remainingQuantity: 0,
        filledQuantity: event.filledQuantity,
        averageFillPrice: event.averageFillPrice,
        filledAt: event.filledAt,
        lifecycleStatus: 'FILLED',
      }, {
        type: 'execution.filled',
        timestamp: event.filledAt,
        message: 'Execution filled',
      });
    });

    this.started = true;
  }

  stop(): void {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions = [];
    this.started = false;
  }

  clear(): void {
    this.records.clear();
  }

  listRecent(filter: TradeHistoryFilter = {}): TradeHistoryRecord[] {
    const limit = filter.limit ?? 100;
    const accountIds = filter.accountIds ? new Set(filter.accountIds) : null;
    const statuses = filter.statuses ? new Set(filter.statuses) : null;
    const normalizedQuery = filter.query?.trim().toLowerCase() ?? '';

    return Array.from(this.records.values())
      .filter((record) => {
        if (accountIds) {
          const matchesMaster = record.masterAccountId ? accountIds.has(record.masterAccountId) : false;
          const matchesFollower = accountIds.has(record.followerAccountId);
          if (!matchesMaster && !matchesFollower) {
            return false;
          }
        }

        if (statuses && !statuses.has(record.lifecycleStatus)) {
          return false;
        }

        if (normalizedQuery.length > 0) {
          const searchable = [
            record.historyId,
            record.intentId,
            record.masterAccountId,
            record.masterFillId,
            record.followerAccountId,
            record.symbol,
            record.side,
            record.lifecycleStatus,
            record.ruleReasonCode,
            record.riskDecisionFingerprint,
            record.riskRuleVersion,
            record.brokerKey,
            record.brokerOrderId,
            record.fillId,
            record.lastErrorMessage,
          ]
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .join(' ')
            .toLowerCase();

          if (!searchable.includes(normalizedQuery)) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit)
      .map((record) => ({
        ...record,
        events: [...record.events],
      }));
  }

  get(intentIdOrHistoryId: string): TradeHistoryRecord | undefined {
    const record = this.records.get(intentIdOrHistoryId);
    if (!record) {
      return undefined;
    }

    return {
      ...record,
      events: [...record.events],
    };
  }

  markRecoveryItemReviewed(
    historyId: string,
    options: {
      note?: string;
      reviewedAt?: string;
    } = {},
  ): TradeHistoryRecord | undefined {
    const existing = this.records.get(historyId);
    if (!existing) {
      return undefined;
    }

    const reviewedAt = options.reviewedAt ?? new Date().toISOString();
    const reviewNote = options.note?.trim();

    this.records.set(historyId, {
      ...existing,
      reviewStatus: 'reviewed',
      reviewNote: reviewNote && reviewNote.length > 0 ? reviewNote : existing.reviewNote,
      reviewedAt,
      updatedAt: reviewedAt,
      events: [
        {
          type: 'review.marked',
          timestamp: reviewedAt,
          message:
            reviewNote && reviewNote.length > 0
              ? `Failure reviewed: ${reviewNote}`
              : 'Failure reviewed',
        },
        ...existing.events,
      ].slice(0, 25),
    });

    return this.get(historyId);
  }

  private mapIntentStatus(status: TradeIntentStatus): TradeHistoryLifecycleStatus {
    switch (status) {
      case 'ACKNOWLEDGED':
        return 'ACKNOWLEDGED';
      case 'FILLED':
        return 'FILLED';
      case 'FAILED':
      case 'REJECTED':
        return 'FAILED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'SENT':
        return 'SENT';
      default:
        return 'INTENT_CREATED';
    }
  }

  private patchIntentRecord(
    intentId: string,
    patch: Partial<TradeHistoryRecord>,
    event: TradeHistoryEvent,
  ): void {
    const existing = this.records.get(intentId);
    if (!existing) {
      return;
    }

    this.records.set(intentId, {
      ...existing,
      ...patch,
      updatedAt: event.timestamp,
      events: [event, ...existing.events].slice(0, 25),
    });
  }

  private upsert(
    historyId: string,
    seed: Omit<TradeHistoryRecord, 'createdAt' | 'updatedAt' | 'events'>,
    event: TradeHistoryEvent,
  ): void {
    const existing = this.records.get(historyId);
    if (!existing) {
      this.records.set(historyId, {
        ...seed,
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
        events: [event],
      });
      return;
    }

    this.records.set(historyId, {
      ...existing,
      ...seed,
      createdAt: existing.createdAt,
      updatedAt: event.timestamp,
      events: [event, ...existing.events].slice(0, 25),
    });
  }

  private subscribe<K extends keyof PropCopiaEventMap>(
    eventName: K,
    handler: EventHandler<PropCopiaEventMap[K]>,
  ): void {
    propCopiaEventBus.subscribe(eventName, handler);
    this.subscriptions.push(() => propCopiaEventBus.unsubscribe(eventName, handler));
  }
}

export const tradeHistoryStore = new TradeHistoryStore();
tradeHistoryStore.start();
