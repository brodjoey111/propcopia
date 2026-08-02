import type { TradeIntent } from './trade-intent-types';
import type { OrderType, TimeInForce, TradeSide } from './trading-domain';

export interface BrokerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  submitOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult>;
  cancelOrder(brokerOrderId: string, accountId: string): Promise<void>;
  getAccounts(): Promise<BrokerAccount[]>;
  getPositions(accountId?: string): Promise<BrokerPosition[]>;
}

export interface BrokerOrderRequest {
  accountId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  orderType: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
  intentId: string;
}

export interface BrokerOrderResult {
  accepted: boolean;
  brokerOrderId?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  submittedAt: string;
}

export interface BrokerAccount {
  accountId: string;
  broker: string;
  name: string;
  accountType?: string;
  balance?: number;
  currency?: string;
}

export interface BrokerPosition {
  accountId: string;
  symbol: string;
  quantity: number;
  averagePrice?: number;
  side?: 'LONG' | 'SHORT' | 'FLAT';
  unrealizedPnl?: number;
}

export type ExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'RETRY_WAIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export interface RetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface ExecutionContext {
  intent: TradeIntent;
  brokerKey: string;
  request: BrokerOrderRequest;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface ExecutionRecord {
  intentId: string;
  brokerKey: string;
  intent: TradeIntent;
  request: BrokerOrderRequest;
  retryPolicy: RetryPolicy;
  status: ExecutionStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  nextRetryAt?: string;
  brokerOrderId?: string;
  lastResult?: BrokerOrderResult;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}
