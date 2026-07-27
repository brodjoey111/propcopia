import type { BrokerInterface } from "./BrokerInterface";
import type {
  BrokerAccount,
  BrokerConnection,
  BrokerType,
  OrderRequest,
} from "./types";

interface RegisteredBroker {
  type: BrokerType;
  broker: BrokerInterface;
}

export class BrokerManager {
  private brokers = new Map<string, RegisteredBroker>();

  registerBroker(
    connectionId: string,
    type: BrokerType,
    broker: BrokerInterface,
  ): void {
    if (this.brokers.has(connectionId)) {
      throw new Error(
        `Broker connection "${connectionId}" is already registered.`,
      );
    }

    this.brokers.set(connectionId, {
      type,
      broker,
    });
  }

  replaceBroker(
    connectionId: string,
    type: BrokerType,
    broker: BrokerInterface,
  ): void {
    this.brokers.set(connectionId, {
      type,
      broker,
    });
  }

  getBroker(connectionId: string): BrokerInterface {
    const registeredBroker = this.brokers.get(connectionId);

    if (!registeredBroker) {
      throw new Error(
        `Broker connection "${connectionId}" has not been registered.`,
      );
    }

    return registeredBroker.broker;
  }

  getBrokerType(connectionId: string): BrokerType {
    const registeredBroker = this.brokers.get(connectionId);

    if (!registeredBroker) {
      throw new Error(
        `Broker connection "${connectionId}" has not been registered.`,
      );
    }

    return registeredBroker.type;
  }

  hasBroker(connectionId: string): boolean {
    return this.brokers.has(connectionId);
  }

  async connect(connectionId: string): Promise<BrokerConnection> {
    return this.getBroker(connectionId).connect();
  }

  async disconnect(connectionId: string): Promise<void> {
    await this.getBroker(connectionId).disconnect();
  }

  async reconnect(connectionId: string): Promise<void> {
    await this.getBroker(connectionId).reconnect();
  }

  async getAccounts(connectionId: string): Promise<BrokerAccount[]> {
    return this.getBroker(connectionId).getAccounts();
  }

  async placeOrder(connectionId: string, order: OrderRequest): Promise<void> {
    await this.getBroker(connectionId).placeOrder(order);
  }

  async flatten(connectionId: string, accountId: string): Promise<void> {
    await this.getBroker(connectionId).flatten(accountId);
  }

  isConnected(connectionId: string): boolean {
    return this.getBroker(connectionId).isConnected();
  }

  async removeBroker(connectionId: string): Promise<void> {
    const registeredBroker = this.brokers.get(connectionId);

    if (!registeredBroker) {
      return;
    }

    await registeredBroker.broker.disconnect();
    this.brokers.delete(connectionId);
  }

  getRegisteredConnectionIds(): string[] {
    return Array.from(this.brokers.keys());
  }

  getConnectionCount(): number {
    return this.brokers.size;
  }
}

export const brokerManager = new BrokerManager();
