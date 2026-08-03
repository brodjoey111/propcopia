import type { BrokerOrderRequest } from '../execution-types';

export interface OrderMapper<TPayload> {
  mapOrder(request: BrokerOrderRequest): TPayload;
}
