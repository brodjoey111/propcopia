import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { Account } from '@shared/schema';

// Trade notification structure
interface TradeNotification {
  accountId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: number;
  fillId: string; // Unique identifier for idempotency
}

// Follower account connection state
interface FollowerConnection {
  accountId: string;
  positionMultiplier: number; // Pre-calculated scaling ratio
  maxContracts?: number;
  blockedTickers: string[];
  ws: WebSocket | null;
  accessToken: string | null;
  isReady: boolean;
}

// Latency metrics
interface LatencyMetrics {
  tradeId: string;
  receivedAt: number;
  processedAt: number;
  copiedAt: number;
  totalLatency: number;
  followerLatencies: Map<string, number>;
}

// Event-driven trade copying engine with ~15ms target latency
export class TradeCopyEngine extends EventEmitter {
  private masterAccountId: string | null = null;
  private masterWebSocket: WebSocket | null = null;
  private followerConnections: Map<string, FollowerConnection> = new Map();
  private processedFills: Set<string> = new Set(); // Idempotency cache
  private positionScalingCache: Map<string, number> = new Map(); // In-memory scaling cache
  private latencyMetrics: LatencyMetrics[] = [];
  private baseUrl: string;

  constructor(environment: 'demo' | 'live' = 'demo') {
    super();
    this.baseUrl = environment === 'demo'
      ? 'https://demo.tradovateapi.com/v1'
      : 'https://live.tradovateapi.com/v1';
    
    // WebSocket URLs
    const wsBaseUrl = environment === 'demo'
      ? 'wss://demo.tradovateapi.com/v1/websocket'
      : 'wss://live.tradovateapi.com/v1/websocket';
    
    console.log('[TradeCopy] Engine initialized for', environment, 'environment');
  }

  // Pre-load position scaling multipliers into memory
  async initializeScalingCache(accounts: Account[]): Promise<void> {
    const startTime = performance.now();
    
    for (const account of accounts) {
      const multiplier = (account.positionScaling || 100) / 100;
      this.positionScalingCache.set(account.id, multiplier);
    }
    
    const loadTime = performance.now() - startTime;
    console.log(`[TradeCopy] Scaling cache initialized for ${accounts.length} accounts in ${loadTime.toFixed(2)}ms`);
  }

  // Establish WebSocket connection to master account for real-time fills
  async connectMasterAccount(accountId: string, accessToken: string): Promise<void> {
    this.masterAccountId = accountId;
    
    const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('/v1', '/v1/websocket');
    
    return new Promise((resolve, reject) => {
      try {
        this.masterWebSocket = new WebSocket(wsUrl);
        
        this.masterWebSocket.on('open', () => {
          console.log('[TradeCopy] Master WebSocket connected');
          
          // Authenticate WebSocket connection
          this.masterWebSocket?.send(JSON.stringify({
            type: 'authorize',
            token: accessToken
          }));
          
          // Subscribe to fill events
          this.masterWebSocket?.send(JSON.stringify({
            type: 'subscribe',
            topic: 'fill',
            accountId: accountId
          }));
          
          resolve();
        });
        
        this.masterWebSocket.on('message', (data: Buffer) => {
          this.handleMasterFill(data);
        });
        
        this.masterWebSocket.on('error', (error) => {
          console.error('[TradeCopy] Master WebSocket error:', error);
          reject(error);
        });
        
        this.masterWebSocket.on('close', () => {
          console.log('[TradeCopy] Master WebSocket closed, attempting reconnect...');
          setTimeout(() => this.connectMasterAccount(accountId, accessToken), 5000);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Add follower account with persistent WebSocket connection
  async addFollowerAccount(
    account: Account,
    accessToken: string,
    globalScaling?: number
  ): Promise<void> {
    const startTime = performance.now();
    
    // Calculate final position multiplier
    const accountScaling = (account.positionScaling || 100) / 100;
    const globalMultiplier = globalScaling ? globalScaling / 100 : 1;
    const finalMultiplier = accountScaling * globalMultiplier;
    
    const connection: FollowerConnection = {
      accountId: account.id,
      positionMultiplier: finalMultiplier,
      maxContracts: account.maxContracts || undefined,
      blockedTickers: account.blockedTickers || [],
      ws: null,
      accessToken: accessToken,
      isReady: false
    };
    
    // Establish persistent WebSocket connection
    await this.connectFollowerWebSocket(connection);
    
    this.followerConnections.set(account.id, connection);
    
    const setupTime = performance.now() - startTime;
    console.log(`[TradeCopy] Follower ${account.name} added in ${setupTime.toFixed(2)}ms`);
  }

  // Establish persistent WebSocket for follower account
  private async connectFollowerWebSocket(connection: FollowerConnection): Promise<void> {
    const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('/v1', '/v1/websocket');
    
    return new Promise((resolve) => {
      connection.ws = new WebSocket(wsUrl);
      
      connection.ws.on('open', () => {
        // Authenticate
        connection.ws?.send(JSON.stringify({
          type: 'authorize',
          token: connection.accessToken
        }));
        
        connection.isReady = true;
        resolve();
      });
      
      connection.ws.on('error', (error) => {
        console.error(`[TradeCopy] Follower ${connection.accountId} WebSocket error:`, error);
      });
      
      connection.ws.on('close', () => {
        connection.isReady = false;
        console.log(`[TradeCopy] Follower ${connection.accountId} WebSocket closed, reconnecting...`);
        setTimeout(() => this.connectFollowerWebSocket(connection), 5000);
      });
    });
  }

  // Handle incoming fill from master account
  private handleMasterFill(data: Buffer): void {
    const receiveTime = performance.now();
    
    try {
      const message = JSON.parse(data.toString());
      
      // Filter for fill events only
      if (message.type !== 'fill') {
        return;
      }
      
      const fill = message.data;
      const fillId = `${fill.orderId}-${fill.timestamp}`;
      
      // Idempotency check: skip if already processed
      if (this.processedFills.has(fillId)) {
        return;
      }
      this.processedFills.add(fillId);
      
      // Clean up old processed fills (keep last 10000)
      if (this.processedFills.size > 10000) {
        const fillsArray = Array.from(this.processedFills);
        this.processedFills = new Set(fillsArray.slice(-5000));
      }
      
      const trade: TradeNotification = {
        accountId: this.masterAccountId!,
        symbol: fill.symbol,
        action: fill.action === 'Buy' ? 'BUY' : 'SELL',
        quantity: fill.quantity,
        price: fill.price,
        timestamp: fill.timestamp,
        fillId: fillId
      };
      
      const processTime = performance.now();
      
      // CRITICAL: Copy to all followers in parallel (non-blocking)
      this.copyTradeToFollowers(trade, receiveTime, processTime);
      
    } catch (error) {
      console.error('[TradeCopy] Error processing master fill:', error);
    }
  }

  // Copy trade to all followers in parallel
  private async copyTradeToFollowers(
    trade: TradeNotification,
    receiveTime: number,
    processTime: number
  ): Promise<void> {
    const followers = Array.from(this.followerConnections.values());
    
    if (followers.length === 0) {
      return;
    }
    
    const metrics: LatencyMetrics = {
      tradeId: trade.fillId,
      receivedAt: receiveTime,
      processedAt: processTime,
      copiedAt: 0,
      totalLatency: 0,
      followerLatencies: new Map()
    };
    
    // Execute all follower trades in parallel
    const copyPromises = followers.map(async (follower) => {
      const followerStartTime = performance.now();
      
      try {
        // Check if ticker is blocked
        if (follower.blockedTickers.includes(trade.symbol)) {
          console.log(`[TradeCopy] ${follower.accountId} blocks ${trade.symbol}`);
          return;
        }
        
        // Calculate scaled quantity
        let scaledQuantity = Math.floor(trade.quantity * follower.positionMultiplier);
        
        // Apply max contracts limit
        if (follower.maxContracts && scaledQuantity > follower.maxContracts) {
          scaledQuantity = follower.maxContracts;
        }
        
        if (scaledQuantity === 0) {
          return; // Skip if quantity rounds down to zero
        }
        
        // Send order via WebSocket (fastest method)
        if (follower.isReady && follower.ws) {
          follower.ws.send(JSON.stringify({
            type: 'placeOrder',
            symbol: trade.symbol,
            action: trade.action,
            quantity: scaledQuantity,
            orderType: 'Market',
            timestamp: Date.now()
          }));
          
          const followerLatency = performance.now() - followerStartTime;
          metrics.followerLatencies.set(follower.accountId, followerLatency);
        }
      } catch (error) {
        console.error(`[TradeCopy] Error copying to ${follower.accountId}:`, error);
      }
    });
    
    // Wait for all copies to complete
    await Promise.all(copyPromises);
    
    const completeTime = performance.now();
    metrics.copiedAt = completeTime;
    metrics.totalLatency = completeTime - receiveTime;
    
    // Log latency
    this.logLatency(metrics);
    
    // Emit event for async DB logging (non-blocking)
    this.emit('tradeCopied', {
      trade,
      metrics,
      followerCount: followers.length
    });
  }

  // Log latency metrics
  private logLatency(metrics: LatencyMetrics): void {
    this.latencyMetrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.latencyMetrics.length > 1000) {
      this.latencyMetrics = this.latencyMetrics.slice(-500);
    }
    
    console.log(`[TradeCopy] Trade ${metrics.tradeId} copied in ${metrics.totalLatency.toFixed(2)}ms`);
    
    // Log per-follower latency
    metrics.followerLatencies.forEach((latency, accountId) => {
      console.log(`  └─ ${accountId}: ${latency.toFixed(2)}ms`);
    });
  }

  // Get average latency statistics
  getLatencyStats(): {
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    p50: number;
    p95: number;
    p99: number;
    sampleSize: number;
  } {
    if (this.latencyMetrics.length === 0) {
      return {
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        sampleSize: 0
      };
    }
    
    const latencies = this.latencyMetrics.map(m => m.totalLatency).sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    
    return {
      avgLatency: sum / latencies.length,
      minLatency: latencies[0],
      maxLatency: latencies[latencies.length - 1],
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      sampleSize: latencies.length
    };
  }

  // Disconnect all WebSocket connections
  async disconnect(): Promise<void> {
    if (this.masterWebSocket) {
      this.masterWebSocket.close();
    }
    
    const connections = Array.from(this.followerConnections.values());
    for (const connection of connections) {
      if (connection.ws) {
        connection.ws.close();
      }
    }
    
    this.followerConnections.clear();
    console.log('[TradeCopy] All connections closed');
  }
}
