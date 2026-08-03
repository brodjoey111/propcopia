import type { BrokerOrderRequest } from '../execution-types';
import type { TradovatePlaceOrderParams } from '../tradovate-api';
import type { OrderMapper } from './OrderMapper';

export interface TradovateOrderMapperConfig {
  accountSpec: string;
}

export class TradovateOrderMapper implements OrderMapper<TradovatePlaceOrderParams> {
  constructor(private config: TradovateOrderMapperConfig) {}

  mapOrder(request: BrokerOrderRequest): TradovatePlaceOrderParams {
    const action = request.side === 'BUY' ? 'Buy' : 'Sell';

    const orderTypeMap: Record<
      BrokerOrderRequest['orderType'],
      TradovatePlaceOrderParams['orderType']
    > = {
      MARKET: 'Market',
      LIMIT: 'Limit',
      STOP: 'Stop',
      STOP_LIMIT: 'StopLimit',
    };

    const timeInForceMap: Record<
      NonNullable<BrokerOrderRequest['timeInForce']>,
      NonNullable<TradovatePlaceOrderParams['timeInForce']>
    > = {
      DAY: 'Day',
      GTC: 'GTC',
      IOC: 'IOC',
      FOK: 'FOK',
    };

    return {
      accountSpec: this.config.accountSpec,
      accountId: request.accountId,
      action,
      symbol: request.symbol,
      orderQty: request.quantity,
      orderType: orderTypeMap[request.orderType],
      price: request.limitPrice,
      stopPrice: request.stopPrice,
      timeInForce:
        request.timeInForce === undefined
          ? undefined
          : timeInForceMap[request.timeInForce],
      clOrdId: request.clientOrderId ?? request.intentId,
      isAutomated: true,
    };
  }
}
