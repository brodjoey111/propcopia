interface TradovateCredentials {
  username: string;
  password: string;
  cid: string;
  secret: string;
  environment: 'demo' | 'live';
}

interface TradovateAuthResponse {
  accessToken: string;
  expirationTime: string;
  userId: number;
  userStatus?: string;
}

export interface TradovatePlaceOrderParams {
  accountSpec: string;
  accountId: number | string;
  action: 'Buy' | 'Sell';
  symbol: string;
  orderQty: number;
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  price?: number;
  stopPrice?: number;
  timeInForce?: 'Day' | 'GTC' | 'IOC' | 'FOK';
  clOrdId?: string;
  isAutomated: true;
}

export interface TradovatePlaceOrderAccepted {
  orderId: number | string;
}

export interface TradovatePlaceOrderRejected {
  failureReason?: string;
  failureText?: string;
  commandId?: number;
}

export type TradovatePlaceOrderResult =
  | TradovatePlaceOrderAccepted
  | TradovatePlaceOrderRejected;

export class TradovateAPI {
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(environment: 'demo' | 'live' = 'demo') {
    this.baseUrl = environment === 'demo' 
      ? 'https://demo.tradovateapi.com/v1'
      : 'https://live.tradovateapi.com/v1';
  }

  async authenticate(credentials: Omit<TradovateCredentials, 'environment'>): Promise<TradovateAuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/accessTokenRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: credentials.username,
        password: credentials.password,
        appId: 'TradeCopier',
        appVersion: '1.0',
        cid: credentials.cid,
        sec: credentials.secret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tradovate authentication failed: ${response.status} - ${errorText}`);
    }

    const authData: TradovateAuthResponse = await response.json();
    this.accessToken = authData.accessToken;
    this.tokenExpiration = new Date(authData.expirationTime);

    return authData;
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.accessToken) {
      return {
        success: false,
        message: 'Not authenticated. Please authenticate first.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/account/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Connection test failed: ${response.status} - ${errorText}`,
        };
      }

      const accounts = await response.json();
      return {
        success: true,
        message: 'Connection successful!',
        data: accounts,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getAccountInfo(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/account/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch account info: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async getPositions(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/position/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch positions: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async placeOrder(
    params: TradovatePlaceOrderParams
  ): Promise<TradovatePlaceOrderResult> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    if (!params.accountSpec.trim()) {
      throw new Error('Tradovate placeOrder requires accountSpec.');
    }

    if (
      (typeof params.accountId === 'string' && params.accountId.trim().length === 0) ||
      (typeof params.accountId === 'number' && !Number.isFinite(params.accountId))
    ) {
      throw new Error('Tradovate placeOrder requires accountId.');
    }

    if (!params.symbol.trim()) {
      throw new Error('Tradovate placeOrder requires symbol.');
    }

    if (!Number.isInteger(params.orderQty) || params.orderQty <= 0) {
      throw new Error('Tradovate placeOrder requires a positive integer orderQty.');
    }

    if (params.orderType === 'Limit' && params.price === undefined) {
      throw new Error('Tradovate LIMIT orders require price.');
    }

    if (params.orderType === 'Stop' && params.stopPrice === undefined) {
      throw new Error('Tradovate STOP orders require stopPrice.');
    }

    if (
      params.orderType === 'StopLimit' &&
      (params.price === undefined || params.stopPrice === undefined)
    ) {
      throw new Error('Tradovate STOP_LIMIT orders require both price and stopPrice.');
    }

    const response = await fetch(`${this.baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tradovate place order failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /** Liquidate a single open position by accountId + contractId */
  async liquidatePosition(accountId: number, contractId: number): Promise<any> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${this.baseUrl}/order/liquidatePosition`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId, contractId, admin: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Liquidate failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /** Close every open position on this connection (optionally filtered to one accountId) */
  async closeAllPositions(filterAccountId?: number): Promise<{ closed: number; errors: string[] }> {
    const positions: any[] = await this.getPositions();
    const errors: string[] = [];
    let closed = 0;

    for (const pos of positions) {
      if (!pos.netPos || pos.netPos === 0) continue;
      if (filterAccountId !== undefined && pos.accountId !== filterAccountId) continue;
      try {
        await this.liquidatePosition(pos.accountId, pos.contractId);
        closed++;
        console.log(`[KillSwitch] Tradovate liquidated position contractId=${pos.contractId} accountId=${pos.accountId}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`contractId ${pos.contractId}: ${msg}`);
        console.error(`[KillSwitch] Failed to liquidate Tradovate position:`, msg);
      }
    }

    return { closed, errors };
  }

  isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiration) {
      return false;
    }
    return new Date() < this.tokenExpiration;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}
