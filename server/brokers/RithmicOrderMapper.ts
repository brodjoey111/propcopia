import type { BrokerOrderRequest } from '../execution-types';
import type { OrderMapper } from './OrderMapper';

export type RithmicSendOrderParams = {
  accountId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  price?: number;
};

export interface RithmicOrderMapperConfig {
  exchange: string;
}

export class RithmicOrderMapper implements OrderMapper<RithmicSendOrderParams> {
  constructor(private config: RithmicOrderMapperConfig) {}

  mapOrder(request: BrokerOrderRequest): RithmicSendOrderParams {
    const exchange = this.config.exchange.trim();
    if (!exchange) {
      throw new Error('Rithmic exchange must not be empty.');
    }

    if (request.quantity <= 0) {
      throw new Error('Rithmic order quantity must be greater than 0.');
    }

    if (request.orderType === 'STOP_LIMIT') {
      throw new Error('Rithmic STOP_LIMIT orders are not implemented.');
    }

    if (request.orderType === 'LIMIT' && request.limitPrice === undefined) {
      throw new Error('Rithmic LIMIT orders require limitPrice.');
    }

    if (request.orderType === 'STOP' && request.stopPrice === undefined) {
      throw new Error('Rithmic STOP orders require stopPrice.');
    }

    return {
      accountId: request.accountId,
      symbol: request.symbol,
      exchange,
      side: request.side,
      quantity: request.quantity,
      orderType: request.orderType,
      price:
        request.orderType === 'LIMIT'
          ? request.limitPrice
          : request.orderType === 'STOP'
            ? request.stopPrice
            : undefined,
    };
  }
}
