interface TradeifyCredentials {
  username: string;
  apiKey: string;
}

interface TradeifyAuthResponse {
  accessToken: string;
  expirationTime: string;
  userId: string;
}

interface TradeifyAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
  equity: number;
  status: string;
}

interface TradeifyPosition {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
}

export class TradeifyAPI {
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;
  private username: string | null = null;

  constructor() {
    this.baseUrl = 'https://gateway-api.projectx.com/api';
  }

  async authenticate(credentials: TradeifyCredentials): Promise<TradeifyAuthResponse> {
    this.username = credentials.username;
    
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: credentials.username,
        apiKey: credentials.apiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tradeify authentication failed: ${response.status} - ${errorText}`);
    }

    const authData: TradeifyAuthResponse = await response.json();
    this.accessToken = authData.accessToken;
    this.tokenExpiration = new Date(authData.expirationTime);

    return authData;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    if (this.tokenExpiration && new Date() >= this.tokenExpiration) {
      throw new Error('Token expired. Please re-authenticate.');
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      await this.ensureAuthenticated();

      const response = await fetch(`${this.baseUrl}/Account`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
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

  async getAccounts(): Promise<TradeifyAccount[]> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Account`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch accounts: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  async getAccountInfo(accountId: string): Promise<TradeifyAccount> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Account/${accountId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch account info: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async getPositions(accountId: string): Promise<TradeifyPosition[]> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Position?accountId=${accountId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch positions: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async placeOrder(params: {
    accountId: string;
    symbol: string;
    side: 'Buy' | 'Sell';
    quantity: number;
    orderType: 'Market' | 'Limit' | 'Stop';
    price?: number;
    stopPrice?: number;
  }): Promise<any> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Order/place`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: params.accountId,
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        orderType: params.orderType,
        price: params.price,
        stopPrice: params.stopPrice,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to place order: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async cancelOrder(orderId: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Order/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to cancel order: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async getTradeHistory(params: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Trade/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch trade history: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async searchInstrument(symbol: string): Promise<any> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/Instrument/search?query=${encodeURIComponent(symbol)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search instrument: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.tokenExpiration && new Date() < this.tokenExpiration;
  }
}
