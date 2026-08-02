import type { TradeSide } from './trading-domain';

export type TradeIntentStatus =
  | 'NEW'
  | 'VALIDATED'
  | 'READY_TO_SEND'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'FILLED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export interface TradeIntent {
  intentId: string;
  masterAccountId: string;
  masterFillId: string;
  followerAccountId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  createdAt: string;
  status: TradeIntentStatus;
}
