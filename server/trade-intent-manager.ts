import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import type { TradeIntent, TradeIntentStatus } from './trade-intent-types';

export type { TradeIntent, TradeIntentStatus } from './trade-intent-types';

const ALLOWED_TRANSITIONS: Record<TradeIntentStatus, TradeIntentStatus[]> = {
  NEW: ['VALIDATED', 'FAILED', 'CANCELLED'],
  VALIDATED: ['READY_TO_SEND', 'FAILED', 'CANCELLED'],
  READY_TO_SEND: ['SENT', 'FAILED', 'CANCELLED'],
  SENT: ['ACKNOWLEDGED', 'FILLED', 'REJECTED', 'CANCELLED', 'FAILED'],
  ACKNOWLEDGED: ['FILLED', 'REJECTED', 'CANCELLED', 'FAILED'],
  FILLED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED: [],
};

export class TradeIntentManager extends EventEmitter {
  private intents: Map<string, TradeIntent> = new Map();

  createIntent(input: Omit<TradeIntent, 'intentId' | 'createdAt' | 'status'>): TradeIntent {
    const intent: TradeIntent = {
      intentId: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'NEW',
      ...input,
    };

    this.intents.set(intent.intentId, intent);
    this.emit('intentCreated', intent);
    return intent;
  }

  getIntent(intentId: string): TradeIntent | undefined {
    return this.intents.get(intentId);
  }

  getAllIntents(): TradeIntent[] {
    return Array.from(this.intents.values());
  }

  markValidated(intentId: string): TradeIntent {
    return this.transition(intentId, 'VALIDATED');
  }

  markReadyToSend(intentId: string): TradeIntent {
    return this.transition(intentId, 'READY_TO_SEND');
  }

  markSent(intentId: string): TradeIntent {
    return this.transition(intentId, 'SENT');
  }

  markAcknowledged(intentId: string): TradeIntent {
    return this.transition(intentId, 'ACKNOWLEDGED');
  }

  markFilled(intentId: string): TradeIntent {
    return this.transition(intentId, 'FILLED');
  }

  markRejected(intentId: string): TradeIntent {
    return this.transition(intentId, 'REJECTED');
  }

  markCancelled(intentId: string): TradeIntent {
    return this.transition(intentId, 'CANCELLED');
  }

  markFailed(intentId: string): TradeIntent {
    return this.transition(intentId, 'FAILED');
  }

  private transition(intentId: string, nextStatus: TradeIntentStatus): TradeIntent {
    const intent = this.intents.get(intentId);

    if (!intent) {
      throw new Error(`Trade intent not found: ${intentId}`);
    }

    const allowedStatuses = ALLOWED_TRANSITIONS[intent.status];
    if (!allowedStatuses.includes(nextStatus)) {
      throw new Error(`Invalid trade intent transition: ${intent.status} -> ${nextStatus}`);
    }

    const updatedIntent: TradeIntent = {
      ...intent,
      status: nextStatus,
    };

    this.intents.set(intentId, updatedIntent);
    this.emit('intentUpdated', updatedIntent);
    return updatedIntent;
  }
}
