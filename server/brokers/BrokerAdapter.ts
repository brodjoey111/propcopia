import type {
  BrokerAccount,
  BrokerOrderRequest,
  BrokerOrderResult,
  BrokerPosition,
} from '../execution-types';

export interface BrokerAdapterConnectionState {
  connected: boolean;
  authenticated: boolean;
  brokerAccountIds: string[];
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  lastError?: string;
}

export interface BrokerAdapterInit {
  brokerKey: string;
  environment?: 'demo' | 'live' | 'test';
}

export interface BrokerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionState(): BrokerAdapterConnectionState;
  submitOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult>;
  cancelOrder(brokerOrderId: string, accountId: string): Promise<void>;
  getAccounts(): Promise<BrokerAccount[]>;
  getPositions(accountId?: string): Promise<BrokerPosition[]>;
}
