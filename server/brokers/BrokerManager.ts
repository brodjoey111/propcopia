import type { BrokerInterface } from "./BrokerInterface";
import type { BrokerType, OrderRequest } from "./types";

export class BrokerManager {
  private brokers = new Map<BrokerType, BrokerInterface>();

  registerBroker(type: BrokerType, broker: BrokerInterface): void {
    if (this.brokers.has(type)) {
      throw new Error(`Broker "${type}" is already registered.`);
    }

    this.brokers.set(type, broker);
  }

  getBroker(type: BrokerType): BrokerInterface {
    const broker = this.brokers.get(type);

    if (!broker) {
      throw new Error(`Broker "${type}" has not been registered.`);
    }

    return broker;
  }

  hasBroker(type: BrokerType): boolean {
    return this.brokers.has(type);
  }

  async connect(type: BrokerType) {
    return this.getBroker(type).connect();
  }

  async disconnect(type: BrokerType): Promise<void> {
    await this.getBroker(type).disconnect();
  }

  async reconnect(type: BrokerType): Promise<void> {
    await this.getBroker(type).reconnect();
  }

  async getAccounts(type: BrokerType) {
    return this.getBroker(type).getAccounts();
  }

  async placeOrder(type: BrokerType, order: OrderRequest): Promise<void> {
    await this.getBroker(type).placeOrder(order);
  }

  async flatten(type: BrokerType, accountId: string): Promise<void> {
    await this.getBroker(type).flatten(accountId);
  }

  isConnected(type: BrokerType): boolean {
    return this.getBroker(type).isConnected();
  }

  getRegisteredBrokers(): BrokerType[] {
    return Array.from(this.brokers.keys());
  }
}

export const brokerManager = new BrokerManager();
