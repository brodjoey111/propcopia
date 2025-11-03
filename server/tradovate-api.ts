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
