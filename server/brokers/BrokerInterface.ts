import { BrokerAccount, BrokerConnection, OrderRequest } from "./types";

export interface BrokerInterface {
  readonly brokerName: string;

  connect(): Promise<BrokerConnection>;

  disconnect(): Promise<void>;

  isConnected(): boolean;

  getAccounts(): Promise<BrokerAccount[]>;

  placeOrder(order: OrderRequest): Promise<void>;

  flatten(accountId: string): Promise<void>;

  reconnect(): Promise<void>;
}