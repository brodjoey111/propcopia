import { TradovateAPI } from '../tradovate-api';
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

export interface TradovateAdapterConfig {
  brokerKey: string;
  environment: 'demo' | 'live';
  credentials: {
    username: string;
    password: string;
    cid: string;
    secret: string;
  };
}

type TradovateApiLike = Pick<
  TradovateAPI,
  'authenticate' | 'getAccountInfo' | 'getPositions' | 'isTokenValid'
>;

type TradovateApiFactory = (environment: 'demo' | 'live') => TradovateApiLike;

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

export class TradovateAdapter implements BrokerAdapter {
  private api: TradovateApiLike;
  private connected = false;
  private authenticated = false;
  private brokerAccountIds: string[] = [];
  private lastConnectedAt?: string;
  private lastDisconnectedAt?: string;
  private lastError?: string;

  constructor(
    private config: TradovateAdapterConfig,
    apiOrFactory?: TradovateApiLike | TradovateApiFactory
  ) {
    if (typeof apiOrFactory === 'function') {
      this.api = apiOrFactory(config.environment);
      return;
    }

    this.api = apiOrFactory ?? new TradovateAPI(config.environment);
  }

  async connect(): Promise<void> {
    try {
      await this.api.authenticate({
        username: this.config.credentials.username,
        password: this.config.credentials.password,
        cid: this.config.credentials.cid,
        secret: this.config.credentials.secret,
      });

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
    this.connected = false;
    this.authenticated = false;
    this.brokerAccountIds = [];
    this.lastDisconnectedAt = new Date().toISOString();
  }

  isConnected(): boolean {
    return this.connected && this.authenticated && this.api.isTokenValid();
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

  async submitOrder(_request: BrokerOrderRequest): Promise<BrokerOrderResult> {
    throw new Error('Tradovate order submission is not implemented.');
  }

  async cancelOrder(_brokerOrderId: string, _accountId: string): Promise<void> {
    throw new Error('Tradovate order cancellation is not implemented.');
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    try {
      const rawAccounts = await this.api.getAccountInfo();
      const accounts = Array.isArray(rawAccounts) ? rawAccounts : [];

      return accounts
        .map((account): BrokerAccount | undefined => {
          const accountId =
            toStringOrUndefined(account.accountId) ??
            toStringOrUndefined(account.id) ??
            toStringOrUndefined(account.name);

          if (!accountId) {
            return undefined;
          }

          return {
            accountId,
            broker: 'tradovate',
            name:
              toStringOrUndefined(account.name) ??
              toStringOrUndefined(account.nickname) ??
              accountId,
            accountType:
              toStringOrUndefined(account.accountType) ??
              toStringOrUndefined(account.type),
            balance:
              toNumber(account.balance) ??
              toNumber(account.cashBalance) ??
              toNumber(account.netLiq),
            currency: toStringOrUndefined(account.currency),
          };
        })
        .filter((account): account is BrokerAccount => account !== undefined);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async getPositions(accountId?: string): Promise<BrokerPosition[]> {
    try {
      const rawPositions = await this.api.getPositions();
      const positions = Array.isArray(rawPositions) ? rawPositions : [];

      return positions
        .map((position): BrokerPosition | undefined => {
          const normalizedAccountId =
            toStringOrUndefined(position.accountId) ??
            toStringOrUndefined(position.id);
          const symbol = toStringOrUndefined(position.symbol);
          const quantity =
            toNumber(position.quantity) ??
            toNumber(position.netPos) ??
            0;

          if (!normalizedAccountId || !symbol) {
            return undefined;
          }

          const explicitSide = toStringOrUndefined(position.side);
          const derivedSide =
            quantity > 0 ? 'LONG' : quantity < 0 ? 'SHORT' : 'FLAT';

          return {
            accountId: normalizedAccountId,
            symbol,
            quantity,
            averagePrice:
              toNumber(position.averagePrice) ??
              toNumber(position.avgPrice),
            side:
              explicitSide === 'LONG' || explicitSide === 'SHORT' || explicitSide === 'FLAT'
                ? explicitSide
                : derivedSide,
            unrealizedPnl:
              toNumber(position.unrealizedPnl) ??
              toNumber(position.openPnl),
          };
        })
        .filter((position): position is BrokerPosition => position !== undefined)
        .filter((position) => accountId === undefined || position.accountId === accountId);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
}
