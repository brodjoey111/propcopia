import { RithmicAPI } from '../rithmic-api';
import type {
  BrokerAdapter,
  BrokerAdapterConnectionState,
} from './BrokerAdapter';
import type {
  BrokerAccount,
  BrokerOrderRequest,
  BrokerOrderResult,
  BrokerPosition,
} from '../execution-types';
import { RithmicOrderMapper } from './RithmicOrderMapper';

export interface RithmicAdapterConfig {
  brokerKey: string;
  environment: 'test' | 'live';
  exchange: string;
  credentials: {
    username: string;
    password: string;
    systemName?: string;
    appName?: string;
    appVersion?: string;
  };
}

type RithmicAccountLike = {
  id?: unknown;
  accountId?: unknown;
  name?: unknown;
  accountType?: unknown;
  balance?: unknown;
  currency?: unknown;
};

type RithmicApiLike = Pick<
  RithmicAPI,
  'authenticate' | 'testConnection' | 'sendOrder' | 'isAuthenticated' | 'disconnect'
>;

type RithmicApiFactory = (config: RithmicAdapterConfig) => RithmicApiLike;

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export class RithmicAdapter implements BrokerAdapter {
  private api: RithmicApiLike;
  private orderMapper: RithmicOrderMapper;
  private connected = false;
  private authenticated = false;
  private brokerAccountIds: string[] = [];
  private lastConnectedAt?: string;
  private lastDisconnectedAt?: string;
  private lastError?: string;

  constructor(
    private config: RithmicAdapterConfig,
    apiOrFactory?: RithmicApiLike | RithmicApiFactory,
  ) {
    this.orderMapper = new RithmicOrderMapper({
      exchange: config.exchange,
    });

    if (typeof apiOrFactory === 'function') {
      this.api = apiOrFactory(config);
      return;
    }

    this.api = apiOrFactory ?? new RithmicAPI({
      username: config.credentials.username,
      password: config.credentials.password,
      systemName: config.credentials.systemName,
      environment: config.environment,
      appName: config.credentials.appName,
      appVersion: config.credentials.appVersion,
    });
  }

  async connect(): Promise<void> {
    try {
      const result = await this.api.authenticate();
      if (!result.success) {
        throw new Error(result.message);
      }

      const accounts = await this.getAccounts();
      this.brokerAccountIds = accounts.map((account) => account.accountId);
      this.connected = true;
      this.authenticated = true;
      this.lastConnectedAt = new Date().toISOString();
      this.lastError = undefined;
    } catch (error) {
      this.connected = false;
      this.authenticated = false;
      this.brokerAccountIds = [];
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.api.disconnect();
    this.connected = false;
    this.authenticated = false;
    this.brokerAccountIds = [];
    this.lastDisconnectedAt = new Date().toISOString();
  }

  isConnected(): boolean {
    return this.connected && this.authenticated && this.api.isAuthenticated() === true;
  }

  getConnectionState(): BrokerAdapterConnectionState {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      brokerAccountIds: [...this.brokerAccountIds],
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastError: this.lastError,
    };
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    try {
      const result = await this.api.testConnection();
      if (!result.success) {
        throw new Error(result.message);
      }

      const accounts = Array.isArray(result.data) ? result.data : [];

      return accounts
        .map((account): BrokerAccount | undefined => {
          const raw = account as RithmicAccountLike;
          const accountId =
            toStringOrUndefined(raw.accountId) ??
            toStringOrUndefined(raw.id) ??
            toStringOrUndefined(raw.name);

          if (!accountId) {
            return undefined;
          }

          return {
            accountId,
            broker: 'rithmic',
            name: toStringOrUndefined(raw.name) ?? accountId,
            accountType: toStringOrUndefined(raw.accountType),
            balance: toNumber(raw.balance),
            currency: toStringOrUndefined(raw.currency),
          };
        })
        .filter((account): account is BrokerAccount => account !== undefined);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async submitOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult> {
    if (!this.isConnected()) {
      throw new Error(`Rithmic adapter is not connected: ${this.config.brokerKey}`);
    }

    await this.api.sendOrder(this.orderMapper.mapOrder(request));

    return {
      accepted: true,
      status: 'SENT',
      submittedAt: new Date().toISOString(),
    };
  }

  async cancelOrder(_brokerOrderId: string, _accountId: string): Promise<void> {
    throw new Error('Rithmic order cancellation is not implemented.');
  }

  async getPositions(_accountId?: string): Promise<BrokerPosition[]> {
    throw new Error('Rithmic position retrieval is not implemented.');
  }
}
