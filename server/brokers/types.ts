export type BrokerType =
  | "rithmic"
  | "tradovate"
  | "tradeify";

export interface BrokerConnection {
  id: string;
  broker: BrokerType;
  connected: boolean;
  accountId: string;
}

export interface BrokerAccount {
  id: string;
  name: string;
  balance?: number;
  accountType?: string;
}

export interface OrderRequest {
  accountId: string;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
  orderType: "MARKET" | "LIMIT" | "STOP";
  price?: number;
}
