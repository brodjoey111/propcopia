import WebSocket from 'ws';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_WS_URL = 'wss://ws.finnhub.io';

interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface PriceUpdateCallback {
  (symbol: string, price: MarketPrice): void;
}

class MarketDataService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<PriceUpdateCallback>> = new Map();
  private currentPrices: Map<string, MarketPrice> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private lastLiveUpdate: Map<string, number> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;

  private symbolMapping: { [key: string]: string } = {
    'ES': 'ES=F',
    'NQ': 'NQ=F',
    'YM': 'YM=F',
    'RTY': 'RTY=F',
  };

  constructor() {
    if (FINNHUB_API_KEY && FINNHUB_API_KEY.length > 10) {
      console.log('[MarketData] Using Finnhub API for real-time data');
      this.connect();
    } else {
      //console.log('[MarketData] No API key configured, using simulated market data');
    }
    this.startSimulatedUpdates();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(`${FINNHUB_WS_URL}?token=${FINNHUB_API_KEY}`);

      this.ws.on('open', () => {
        console.log('[MarketData] WebSocket connected to Finnhub');
        this.isConnecting = false;
        
        Object.values(this.symbolMapping).forEach(symbol => {
          this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'trade' && message.data) {
            message.data.forEach((trade: any) => {
              const originalSymbol = this.getOriginalSymbol(trade.s);
              if (originalSymbol) {
                this.lastLiveUpdate.set(originalSymbol, Date.now());
                this.updatePrice(originalSymbol, trade.p);
              }
            });
          }
        } catch (error) {
          console.error('[MarketData] Error parsing message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('[MarketData] WebSocket error:', error);
        this.isConnecting = false;
      });

      this.ws.on('close', () => {
        console.log('[MarketData] WebSocket closed, reconnecting in 5s...');
        this.isConnecting = false;
        this.ws = null;
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 5000);
      });
    } catch (error) {
      console.error('[MarketData] Error creating WebSocket:', error);
      this.isConnecting = false;
    }
  }

  private getOriginalSymbol(mappedSymbol: string): string | null {
    for (const [original, mapped] of Object.entries(this.symbolMapping)) {
      if (mapped === mappedSymbol) {
        return original;
      }
    }
    return null;
  }

  private startSimulatedUpdates() {
    const baseValues: { [key: string]: number } = {
      'ES': 5850,
      'NQ': 20500,
      'YM': 43000,
      'RTY': 2100,
    };

    Object.entries(baseValues).forEach(([symbol, basePrice]) => {
      const price = basePrice + (Math.random() - 0.5) * 50;
      this.currentPrices.set(symbol, {
        symbol,
        price,
        change: (Math.random() - 0.5) * 20,
        changePercent: (Math.random() - 0.5) * 0.5,
        timestamp: Date.now(),
      });
    });

    this.simulationInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 30000;

      Object.keys(baseValues).forEach(symbol => {
        const lastUpdate = this.lastLiveUpdate.get(symbol) || 0;
        const isStale = now - lastUpdate > staleThreshold;

        if (!FINNHUB_API_KEY || isStale) {
          const current = this.currentPrices.get(symbol);
          if (current) {
            const volatility = 0.0002;
            const change = (Math.random() - 0.5) * current.price * volatility;
            const newPrice = current.price + change;
            
            const openPrice = current.price - current.change;
            const newChange = newPrice - openPrice;
            const newChangePercent = (newChange / openPrice) * 100;

            const updatedPrice: MarketPrice = {
              symbol,
              price: newPrice,
              change: newChange,
              changePercent: newChangePercent,
              timestamp: Date.now(),
            };

            this.currentPrices.set(symbol, updatedPrice);
            this.notifySubscribers(symbol, updatedPrice);
          }
        }
      });
    }, 2000);
  }

  private updatePrice(symbol: string, price: number) {
    const current = this.currentPrices.get(symbol);
    const openPrice = current ? current.price - current.change : price;
    const change = price - openPrice;
    const changePercent = (change / openPrice) * 100;

    const priceData: MarketPrice = {
      symbol,
      price,
      change,
      changePercent,
      timestamp: Date.now(),
    };

    this.currentPrices.set(symbol, priceData);
    this.notifySubscribers(symbol, priceData);
  }

  private notifySubscribers(symbol: string, price: MarketPrice) {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.forEach(callback => callback(symbol, price));
    }
  }

  subscribe(symbol: string, callback: PriceUpdateCallback) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    const currentPrice = this.currentPrices.get(symbol);
    if (currentPrice) {
      callback(symbol, currentPrice);
    }
  }

  unsubscribe(symbol: string, callback: PriceUpdateCallback) {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(symbol);
      }
    }
  }

  getCurrentPrice(symbol: string): MarketPrice | null {
    return this.currentPrices.get(symbol) || null;
  }

  getAllPrices(): Map<string, MarketPrice> {
    return new Map(this.currentPrices);
  }

  close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const marketDataService = new MarketDataService();
export type { MarketPrice };
