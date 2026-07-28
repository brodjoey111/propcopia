import { RithmicAPI, type RithmicCredentials } from "../rithmic-api";

import type { BrokerInterface } from "./BrokerInterface";
import type { BrokerAccount, BrokerConnection, OrderRequest } from "./types";

export class RithmicBroker implements BrokerInterface {
  readonly brokerName = "rithmic";

  private api: RithmicAPI;
  private credentials: RithmicCredentials;
  private connection: BrokerConnection | null = null;

  constructor(credentials: RithmicCredentials) {
    this.credentials = credentials;
    this.api = new RithmicAPI(credentials);
  }

  async connect(): Promise<BrokerConnection> {
    const result = await this.api.testConnection();

    if (!result.success) {
      throw new Error(result.message);
    }

    const firstAccount = result.data?.[0];

    this.connection = {
      id: `${this.credentials.username}-rithmic`,
      broker: "rithmic",
      connected: true,
      accountId: firstAccount?.id ?? `${this.credentials.username}-primary`,
    };

    return this.connection;
  }

  async disconnect(): Promise<void> {
    await this.api.disconnect();

    if (this.connection) {
      this.connection.connected = false;
    }
  }

  isConnected(): boolean {
    return this.api.isAuthenticated();
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const result = await this.api.testConnection();

    if (!result.success) {
      throw new Error(result.message);
    }

    return (result.data ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
      accountType: account.accountType,
    }));
  }

  async placeOrder(order: OrderRequest): Promise<void> {
    await this.api.sendOrder({
      accountId: order.accountId,
      symbol: order.symbol,
      exchange: order.exchange,
      side: order.side,
      quantity: order.quantity,
      orderType: order.orderType,
      price: order.price,
    });
  }

  async flatten(accountId: string): Promise<void> {
    const result = await this.api.closeAllPositions(accountId);

    if (result.errors.length > 0) {
      throw new Error(result.errors.join(", "));
    }
  }

  async reconnect(): Promise<void> {
    await this.disconnect();

    this.api = new RithmicAPI(this.credentials);

    await this.connect();
  }
}
