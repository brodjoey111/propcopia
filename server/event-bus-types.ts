import type { CopyGroup, CopyGroupRuntimeState } from './copy-group-types';
import type { TradeIntent } from './trade-intent-types';
import type { TradeSide } from './trading-domain';

export interface MasterFillReceivedEvent {
  masterAccountId: string;
  fillId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface RuleAllowedEvent {
  groupId?: string;
  followerAccountId: string;
  masterFillId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
}

export interface RuleSkippedEvent {
  groupId?: string;
  followerAccountId: string;
  masterFillId: string;
  symbol: string;
  reasonCode: string;
}

export interface RuleRejectedEvent {
  groupId?: string;
  followerAccountId: string;
  masterFillId: string;
  symbol: string;
  reasonCode: string;
}

export interface IntentCreatedEvent {
  intent: TradeIntent;
}

export interface IntentUpdatedEvent {
  intent: TradeIntent;
  previousStatus: TradeIntent['status'];
}

export interface ExecutionQueuedEvent {
  intentId: string;
  groupId?: string;
  followerAccountId: string;
  brokerKey: string;
  queuedAt: string;
}

export interface ExecutionSentEvent {
  intentId: string;
  groupId?: string;
  followerAccountId: string;
  brokerKey: string;
  brokerOrderId?: string;
  submittedAt: string;
}

export interface ExecutionFailedEvent {
  intentId: string;
  groupId?: string;
  followerAccountId: string;
  brokerKey: string;
  errorCode?: string;
  errorMessage: string;
  failedAt: string;
}

export interface CopyGroupStartedEvent {
  group: CopyGroup;
  runtime: CopyGroupRuntimeState;
  startedAt: string;
}

export interface CopyGroupStoppedEvent {
  group: CopyGroup;
  runtime: CopyGroupRuntimeState;
  stoppedAt: string;
}

export interface CopyGroupPausedEvent {
  group: CopyGroup;
  runtime: CopyGroupRuntimeState;
  pausedAt: string;
}

export interface CopyGroupResumedEvent {
  group: CopyGroup;
  runtime: CopyGroupRuntimeState;
  resumedAt: string;
}

export interface CopyGroupEmergencyStoppedEvent {
  group: CopyGroup;
  runtime: CopyGroupRuntimeState;
  emergencyStoppedAt: string;
  reason?: string;
}

export interface PropCopiaEventMap {
  'trade.master_fill_received': MasterFillReceivedEvent;
  'rule.allowed': RuleAllowedEvent;
  'rule.skipped': RuleSkippedEvent;
  'rule.rejected': RuleRejectedEvent;
  'intent.created': IntentCreatedEvent;
  'intent.updated': IntentUpdatedEvent;
  'execution.queued': ExecutionQueuedEvent;
  'execution.sent': ExecutionSentEvent;
  'execution.failed': ExecutionFailedEvent;
  'copy_group.started': CopyGroupStartedEvent;
  'copy_group.stopped': CopyGroupStoppedEvent;
  'copy_group.paused': CopyGroupPausedEvent;
  'copy_group.resumed': CopyGroupResumedEvent;
  'copy_group.emergency_stopped': CopyGroupEmergencyStoppedEvent;
}
