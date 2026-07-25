import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { TradovateAPI } from "./tradovate-api";
import { TradeifyAPI } from "./tradeify-api";
import { RithmicAPI } from "./rithmic-api";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import { insertUserSchema, updateUserProfileSchema, insertWatchlistItemSchema, insertAccountSchema, accounts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { marketDataService, type MarketPrice } from "./market-data";
import OpenAI from "openai";
import { TradeCopyEngine } from "./trade-copy-engine";
import { tradeLogger } from "./trade-logger";

const tradovateInstances = new Map<string, TradovateAPI>();
const tradeifyInstances = new Map<string, TradeifyAPI>();
const rithmicInstances = new Map<string, RithmicAPI>();
const tradeCopyEngines = new Map<string, TradeCopyEngine>();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerRoutes(app: Express): Server {
  const server = createServer(app);

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      const { username, password } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        bio: "Novice Trader",
      });

      return res.json({
        success: true,
        message: "Account created successfully",
        user: { id: user.id, username: user.username },
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Set session (will be automatically saved)
      req.session.userId = user.id;
      req.session.username = user.username;

      return res.json({
        success: true,
        message: "Login successful",
        user: { id: user.id, username: user.username },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to logout",
        });
      }
      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: "Logged out successfully",
      });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        return res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            bio: user.bio,
            profilePicture: user.profilePicture,
          },
        });
      }
    }
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const result = updateUserProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      const updatedUser = await storage.updateUserProfile(req.session.userId, result.data);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          bio: updatedUser.bio,
          profilePicture: updatedUser.profilePicture,
        },
      });
    } catch (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });
  app.post("/api/tradovate/test-connection", async (req, res) => {
    try {
      const { username, password, cid, secret, environment } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username and password"
        });
      }

      // CID and secret are required for real API authentication
      if (!cid || !secret) {
        return res.status(400).json({
          success: false,
          message: "Missing required API credentials: Client ID (CID) and Secret are required to connect to Tradovate"
        });
      }

      const tradovateAPI = new TradovateAPI(environment || 'demo');
      
      const authResult = await tradovateAPI.authenticate({
        username,
        password,
        cid,
        secret,
      });

      const connectionTest = await tradovateAPI.testConnection();

      if (connectionTest.success) {
        tradovateInstances.set(username, tradovateAPI);
      }

      return res.json({
        success: connectionTest.success,
        message: connectionTest.message,
        authData: {
          userId: authResult.userId,
          tokenExpiration: authResult.expirationTime,
        },
        accounts: connectionTest.data,
      });
    } catch (error) {
      console.error('Tradovate connection error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/tradeify/test-connection", async (req, res) => {
    try {
      const { username, apiKey } = req.body;

      if (!username || !apiKey) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username and API key are required to connect to Tradeify"
        });
      }

      const tradeifyAPI = new TradeifyAPI();
      
      const authResult = await tradeifyAPI.authenticate({
        username,
        apiKey,
      });

      const connectionTest = await tradeifyAPI.testConnection();

      if (connectionTest.success) {
        tradeifyInstances.set(username, tradeifyAPI);
        
        const normalizedAccounts = connectionTest.data?.map((account: any) => ({
          id: String(account.id || account.accountId),
          name: account.name || account.accountName || `Account ${account.id}`,
          accountType: account.accountType || account.type || 'live',
          balance: account.balance || account.netLiquidation || 0,
          active: Boolean(account.active ?? (account.status && account.status.toLowerCase() === 'active')),
        })) || [];

        return res.json({
          success: true,
          message: connectionTest.message,
          accounts: normalizedAccounts,
          authData: {
            userId: authResult.userId,
            tokenExpiration: authResult.expirationTime,
          },
        });
      }

      return res.json({
        success: false,
        message: connectionTest.message || 'Connection test failed',
      });
    } catch (error) {
      console.error('Tradeify connection error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/rithmic/test-connection", async (req, res) => {
    try {
      const { username, password, systemName, environment } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username and password are required to connect to Rithmic",
        });
      }

      const rithmicAPI = new RithmicAPI({
        username,
        password,
        systemName: systemName || 'Rithmic Test',
        environment: environment || 'test',
      });

      const connectionTest = await rithmicAPI.testConnection();

      if (connectionTest.success) {
        rithmicInstances.set(username, rithmicAPI);

        const normalizedAccounts = (connectionTest.data ?? []).map((account: any) => ({
          id: String(account.id),
          name: account.name,
          accountType: account.accountType || 'futures',
          balance: account.balance || 0,
          active: account.active !== false,
        }));

        return res.json({
          success: true,
          message: connectionTest.message,
          accounts: normalizedAccounts,
        });
      }

      return res.json({
        success: false,
        message: connectionTest.message || 'Connection test failed',
      });
    } catch (error) {
      console.error('Rithmic connection error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/tradovate/accounts/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const tradovateAPI = tradovateInstances.get(username);

      if (!tradovateAPI) {
        return res.status(404).json({
          success: false,
          message: "No active connection found for this user. Please authenticate first.",
        });
      }

      if (!tradovateAPI.isTokenValid()) {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please re-authenticate.",
        });
      }

      const accounts = await tradovateAPI.getAccountInfo();
      return res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      console.error('Error fetching Tradovate accounts:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/tradovate/positions/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const tradovateAPI = tradovateInstances.get(username);

      if (!tradovateAPI) {
        return res.status(404).json({
          success: false,
          message: "No active connection found for this user. Please authenticate first.",
        });
      }

      if (!tradovateAPI.isTokenValid()) {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please re-authenticate.",
        });
      }

      const positions = await tradovateAPI.getPositions();
      return res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      console.error('Error fetching Tradovate positions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // Accounts routes
  app.post("/api/accounts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const accountData = insertAccountSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      const [newAccount] = await db.insert(accounts).values(accountData).returning();

      return res.json({
        success: true,
        account: newAccount,
      });
    } catch (error) {
      console.error('Error creating account:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/accounts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, req.session.userId));

      return res.json({
        success: true,
        accounts: userAccounts,
      });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // Trade copying routes
  app.post("/api/trade-copy/start", async (req, res) => {
    try {
      const { userId, masterAccountId, followerAccountIds, environment = 'demo' } = req.body;

      if (!userId || !masterAccountId || !followerAccountIds || !Array.isArray(followerAccountIds)) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: userId, masterAccountId, followerAccountIds",
        });
      }

      // Initialize trade copy engine for this user
      let engine = tradeCopyEngines.get(userId);
      if (!engine) {
        engine = new TradeCopyEngine(environment);
        tradeCopyEngines.set(userId, engine);

        // Connect trade logger to engine events
        engine.on('tradeCopied', ({ trade, metrics, followerCount }) => {
          // Async logging (non-blocking)
          tradeLogger.logTrade({
            masterAccountId: trade.accountId,
            symbol: trade.symbol,
            action: trade.action,
            quantity: trade.quantity,
            price: trade.price.toString(),
            status: 'copied',
          }).catch(err => {
            console.error('[TradeCopy] Error logging trade:', err);
          });

          console.log(`[TradeCopy] Trade copied to ${followerCount} followers in ${metrics.totalLatency.toFixed(2)}ms`);
        });
      }

      // Get master account Tradovate API instance (must be authenticated first)
      const masterUsername = req.body.masterUsername;
      const masterTradovate = tradovateInstances.get(masterUsername);
      
      if (!masterTradovate || !masterTradovate.isTokenValid()) {
        return res.status(401).json({
          success: false,
          message: "Master account not authenticated or token expired",
        });
      }

      // Connect to master account WebSocket
      const masterToken = masterTradovate.getAccessToken();
      if (!masterToken) {
        return res.status(401).json({
          success: false,
          message: "No access token for master account",
        });
      }

      await engine.connectMasterAccount(masterAccountId, masterToken);

      return res.json({
        success: true,
        message: "Trade copying started successfully",
        data: {
          masterAccountId,
          followerCount: followerAccountIds.length,
        },
      });
    } catch (error) {
      console.error('Error starting trade copying:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/trade-copy/add-follower", async (req, res) => {
    try {
      const { userId, accountId, accountName, positionScaling = 100, maxContracts, blockedTickers = [] } = req.body;

      if (!userId || !accountId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: userId, accountId",
        });
      }

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session. Start trade copying first.",
        });
      }

      // Get follower account Tradovate API instance
      const followerUsername = req.body.followerUsername;
      const followerTradovate = tradovateInstances.get(followerUsername);
      
      if (!followerTradovate || !followerTradovate.isTokenValid()) {
        return res.status(401).json({
          success: false,
          message: "Follower account not authenticated or token expired",
        });
      }

      const followerToken = followerTradovate.getAccessToken();
      if (!followerToken) {
        return res.status(401).json({
          success: false,
          message: "No access token for follower account",
        });
      }

      // Add follower to engine
      await engine.addFollowerAccount(
        {
          id: accountId,
          userId: userId,
          name: accountName,
          platform: 'Tradovate',
          accountType: 'follower',
          isConnected: true,
          positionScaling,
          maxContracts,
          blockedTickers,
          tradovateUsername: followerUsername,
          tradovateAccountId: accountId,
          tradovateEnvironment: null,
          tradeifyUsername: null,
          tradeifyAccountId: null,
          tradeifyApiKey: null,
          rithmicUsername: null,
          rithmicAccountId: null,
          rithmicPassword: null,
          rithmicEnvironment: null,
          apiKey: null,
          apiSecret: null,
          balance: null,
          openPositions: 0,
          pnl: null,
          riskMode: 'custom',
          lastSync: null,
        },
        followerToken
      );

      return res.json({
        success: true,
        message: "Follower account added successfully",
      });
    } catch (error) {
      console.error('Error adding follower account:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/trade-copy/stop", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: userId",
        });
      }

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session",
        });
      }

      await engine.disconnect();
      tradeCopyEngines.delete(userId);

      return res.json({
        success: true,
        message: "Trade copying stopped successfully",
      });
    } catch (error) {
      console.error('Error stopping trade copying:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/trade-copy/stats/:userId", (req, res) => {
    try {
      const { userId } = req.params;

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session",
        });
      }

      const stats = engine.getLatencyStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching trade copy stats:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/market/prices", (req, res) => {
    try {
      const prices = marketDataService.getAllPrices();
      const pricesArray = Array.from(prices.entries()).map(([_symbol, data]) => data);
      
      return res.json({
        success: true,
        data: pricesArray,
      });
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/economic-calendar", (req, res) => {
    try {
      // Mock economic calendar data
      // In production, this would call Finnhub API: https://finnhub.io/api/v1/calendar/economic
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const mockEvents = [
        {
          id: '1',
          date: today.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Initial Jobless Claims',
          impact: 'high',
          forecast: '220K',
          previous: '215K',
        },
        {
          id: '2',
          date: today.toISOString().split('T')[0],
          time: '10:00',
          country: 'US',
          event: 'ISM Services PMI',
          impact: 'high',
          forecast: '53.5',
          previous: '54.1',
        },
        {
          id: '3',
          date: today.toISOString().split('T')[0],
          time: '14:00',
          country: 'US',
          event: 'FOMC Member Speech',
          impact: 'medium',
        },
        {
          id: '4',
          date: tomorrow.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Non-Farm Payrolls',
          impact: 'high',
          forecast: '180K',
          previous: '175K',
        },
        {
          id: '5',
          date: tomorrow.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Unemployment Rate',
          impact: 'high',
          forecast: '3.7%',
          previous: '3.7%',
        },
        {
          id: '6',
          date: tomorrow.toISOString().split('T')[0],
          time: '10:00',
          country: 'EU',
          event: 'ECB Interest Rate Decision',
          impact: 'high',
          forecast: '4.50%',
          previous: '4.50%',
        },
        {
          id: '7',
          date: dayAfterTomorrow.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Consumer Price Index (CPI)',
          impact: 'high',
          forecast: '3.2%',
          previous: '3.1%',
        },
        {
          id: '8',
          date: dayAfterTomorrow.toISOString().split('T')[0],
          time: '09:45',
          country: 'US',
          event: 'Core CPI',
          impact: 'high',
          forecast: '4.0%',
          previous: '4.0%',
        },
        {
          id: '9',
          date: dayAfterTomorrow.toISOString().split('T')[0],
          time: '14:30',
          country: 'US',
          event: 'Crude Oil Inventories',
          impact: 'medium',
          previous: '-2.5M',
        },
      ];

      return res.json(mockEvents);
    } catch (error) {
      console.error('Error fetching economic calendar:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/leaderboard", (req, res) => {
    try {
      // Return empty leaderboard - real data will come from actual user accounts
      return res.json({
        success: true,
        data: [],
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });


  // FMP API helper - Get top gainers/losers (LIVE DATA ONLY)
  async function fetchMarketMovers(type: 'gainers' | 'losers' | 'actives') {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('FMP_API_KEY is not configured');
    }
    
    // FMP gainers/losers endpoints (correct URLs for free tier)
    let url: string;
    if (type === 'gainers') {
      url = `https://financialmodelingprep.com/api/v3/gainers?apikey=${apiKey}`;
    } else if (type === 'losers') {
      url = `https://financialmodelingprep.com/api/v3/losers?apikey=${apiKey}`;
    } else {
      url = `https://financialmodelingprep.com/api/v3/actives?apikey=${apiKey}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // FMP returns an array directly or an error object
    if (data.Error || data['Error Message']) {
      throw new Error(data.Error || data['Error Message'] || 'FMP API error');
    }
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('FMP returned no data');
    }
    
    return data;
  }

  // Market Movers endpoint using FMP API (LIVE DATA ONLY - NO SIMULATED FALLBACK)
  app.get("/api/market-movers", async (req, res) => {
    try {
      const type = (req.query.type as string || 'gainers') as 'gainers' | 'losers' | 'actives';
      
      // Fetch LIVE data from FMP - no fallback
      const movers = await fetchMarketMovers(type);

      // Transform data to match our frontend format
      // FMP returns: { symbol, name, change, price, changesPercentage }
      const transformedData = movers.slice(0, 100).map((stock: any) => {
        return {
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: stock.price,
          changesPercentage: stock.changesPercentage,
          change: stock.change,
          volume: stock.volume || 0,
          exchange: 'US',
          open: undefined,
          close: stock.price,
          simulated: false, // Always false - live data only
        };
      });

      return res.json({
        success: true,
        data: transformedData,
        simulated: false, // Always false - live data only
      });
    } catch (error) {
      console.error('Error fetching market movers:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch market movers',
      });
    }
  });

  // Company Overview endpoint (using Finnhub)
  app.get("/api/company/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const finnhubKey = process.env.FINNHUB_API_KEY;
      
      if (!finnhubKey) {
        return res.status(500).json({
          success: false,
          message: "Finnhub API key not configured",
        });
      }

      // Fetch both company profile and basic financials from Finnhub
      const [profileResponse, metricsResponse] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubKey}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${finnhubKey}`)
      ]);

      const profile = await profileResponse.json();
      const metrics = await metricsResponse.json();

      // Check if company was found (Finnhub returns empty object for not found)
      if (!profile || !profile.ticker || Object.keys(profile).length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      // Extract metrics
      const metric = metrics?.metric || {};

      return res.json({
        success: true,
        data: {
          symbol: profile.ticker,
          name: profile.name || symbol,
          description: `${profile.name} is a company in the ${profile.finnhubIndustry || 'N/A'} industry, trading on the ${profile.exchange || 'N/A'} exchange.`,
          sector: profile.finnhubIndustry || 'N/A',
          industry: profile.finnhubIndustry || 'N/A',
          exchange: profile.exchange || 'N/A',
          marketCap: profile.marketCapitalization ? (profile.marketCapitalization * 1000000).toString() : 'N/A',
          peRatio: metric.peNormalizedAnnual || metric.peBasicExclExtraTTM || 'N/A',
          eps: metric.epsNormalizedAnnual || metric.epsExclExtraItemsAnnual || 'N/A',
          dividendYield: metric.dividendYieldIndicatedAnnual ? (metric.dividendYieldIndicatedAnnual / 100).toString() : 'N/A',
          week52High: metric['52WeekHigh'] || 'N/A',
          week52Low: metric['52WeekLow'] || 'N/A',
          beta: metric.beta || 'N/A',
          revenue: metric.revenueTTM ? (metric.revenueTTM * 1000000).toString() : 'N/A',
          profitMargin: metric.netProfitMarginTTM ? (metric.netProfitMarginTTM / 100).toString() : 'N/A',
          address: `${profile.country || 'N/A'}`,
          country: profile.country || 'N/A',
          logo: profile.logo,
          website: profile.weburl,
          phone: profile.phone,
        },
      });
    } catch (error) {
      console.error('Error fetching company overview:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch company overview',
      });
    }
  });

  // Helper function to generate simulated chart data
  function generateSimulatedChartData(symbol: string, timeframe: string, res: any) {
    const basePrice = 250 + Math.random() * 50; // Random base price between 250-300
    const now = Date.now();
    const candles: any[] = [];
    
    let dataPoints = 30;
    let interval = 24 * 60 * 60 * 1000; // 1 day
    
    switch (timeframe) {
      case '1D':
        dataPoints = 78; // Every 5 minutes for 1 day
        interval = 5 * 60 * 1000;
        break;
      case '5D':
        dataPoints = 120;
        interval = 15 * 60 * 1000;
        break;
      case '1M':
        dataPoints = 30;
        interval = 24 * 60 * 60 * 1000;
        break;
      case '6M':
        dataPoints = 180;
        interval = 24 * 60 * 60 * 1000;
        break;
      case '1Y':
        dataPoints = 365;
        interval = 24 * 60 * 60 * 1000;
        break;
      case '5Y':
        dataPoints = 260; // Weekly data
        interval = 7 * 24 * 60 * 60 * 1000;
        break;
    }
    
    let price = basePrice;
    const volatility = 0.02; // 2% volatility
    
    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const changePercent = (Math.random() - 0.5) * volatility * 2;
      const open = price;
      const change = open * changePercent;
      const close = open + change;
      const high = Math.max(open, close) + Math.abs(change) * Math.random();
      const low = Math.min(open, close) - Math.abs(change) * Math.random();
      
      candles.push({
        timestamp,
        date: new Date(timestamp).toISOString(),
        open,
        high,
        low,
        close,
        volume: Math.floor(10000000 + Math.random() * 50000000),
      });
      
      price = close;
    }
    
    return res.json({
      success: true,
      data: {
        timeframe,
        candles,
        simulated: true, // Flag to indicate this is simulated data
      },
    });
  }

  // Historical price data endpoint for charting (using Alpha Vantage)
  app.get("/api/stock/:symbol/chart", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '1M' } = req.query;
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "Alpha Vantage API key not configured",
        });
      }

      let functionName: string;
      let interval: string = '';
      let outputsize: string = 'compact';

      // Map timeframe to Alpha Vantage function and parameters
      switch (timeframe) {
        case '1D':
          functionName = 'TIME_SERIES_INTRADAY';
          interval = '5min';
          outputsize = 'full';
          break;
        case '5D':
          functionName = 'TIME_SERIES_INTRADAY';
          interval = '15min';
          outputsize = 'full';
          break;
        case '1M':
        case '6M':
        case '1Y':
          functionName = 'TIME_SERIES_DAILY';
          outputsize = timeframe === '1M' ? 'compact' : 'full';
          break;
        case '5Y':
          functionName = 'TIME_SERIES_WEEKLY';
          outputsize = 'full';
          break;
        default:
          functionName = 'TIME_SERIES_DAILY';
          outputsize = 'compact';
      }

      // Build URL
      let url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${apiKey}&outputsize=${outputsize}`;
      if (interval) {
        url += `&interval=${interval}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors - use fallback simulated data if rate limited
      if (data.Note || data['Error Message'] || data.Information) {
        console.log('Alpha Vantage rate limit hit, using simulated data');
        return generateSimulatedChartData(symbol, timeframe as string, res);
      }

      // Extract time series data
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      if (!timeSeriesKey || !data[timeSeriesKey]) {
        console.log('No time series data, using simulated data');
        return generateSimulatedChartData(symbol, timeframe as string, res);
      }

      const timeSeries = data[timeSeriesKey];
      
      // Transform data for the chart
      const chartData = Object.entries(timeSeries).map(([dateStr, values]: [string, any]) => ({
        timestamp: new Date(dateStr).getTime(),
        date: dateStr,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'] || '0'),
      }));

      // Sort by timestamp ascending
      chartData.sort((a, b) => a.timestamp - b.timestamp);

      // Filter based on timeframe
      const now = Date.now();
      const filtered = chartData.filter(d => {
        switch (timeframe) {
          case '1D':
            return d.timestamp > now - 24 * 60 * 60 * 1000;
          case '5D':
            return d.timestamp > now - 5 * 24 * 60 * 60 * 1000;
          case '1M':
            return d.timestamp > now - 30 * 24 * 60 * 60 * 1000;
          case '6M':
            return d.timestamp > now - 180 * 24 * 60 * 60 * 1000;
          case '1Y':
            return d.timestamp > now - 365 * 24 * 60 * 60 * 1000;
          case '5Y':
            return d.timestamp > now - 5 * 365 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });

      return res.json({
        success: true,
        data: {
          timeframe,
          candles: filtered,
        },
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch chart data',
      });
    }
  });

  // Current stock quote endpoint
  app.get("/api/stock/:symbol/quote", async (req, res) => {
    try {
      const { symbol } = req.params;
      const finnhubKey = process.env.FINNHUB_API_KEY;
      
      if (!finnhubKey) {
        return res.status(500).json({
          success: false,
          message: "Finnhub API key not configured",
        });
      }

      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
      const response = await fetch(url);
      const data = await response.json();

      // Check if quote is valid
      if (!data || data.c === 0) {
        return res.status(404).json({
          success: false,
          message: 'No quote data available',
        });
      }

      return res.json({
        success: true,
        data: {
          current: data.c,
          change: data.d,
          percentChange: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
        },
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch quote',
      });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const watchlist = await storage.getWatchlist(req.session.userId);
      
      // Fetch quotes for all watchlist items
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          data: watchlist.map(item => ({
            ...item,
            quote: null,
          })),
        });
      }

      const watchlistWithQuotes = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${item.ticker}&apikey=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Global Quote']) {
              const quote = data['Global Quote'];
              return {
                ...item,
                quote: {
                  price: parseFloat(quote['05. price'] || '0'),
                  change: parseFloat(quote['09. change'] || '0'),
                  changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
                  volume: parseInt(quote['06. volume'] || '0'),
                },
              };
            }
            return { ...item, quote: null };
          } catch (error) {
            console.error(`Error fetching quote for ${item.ticker}:`, error);
            return { ...item, quote: null };
          }
        })
      );

      return res.json({
        success: true,
        data: watchlistWithQuotes,
      });
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch watchlist',
      });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = insertWatchlistItemSchema.safeParse({
        ...req.body,
        userId: req.session.userId,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      // Check if ticker already exists in user's watchlist
      const existingWatchlist = await storage.getWatchlist(req.session.userId);
      if (existingWatchlist.some(item => item.ticker === result.data.ticker)) {
        return res.status(409).json({
          success: false,
          message: "Ticker already in watchlist",
        });
      }

      const item = await storage.addToWatchlist(result.data);

      return res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add to watchlist',
      });
    }
  });

  app.delete("/api/watchlist/:ticker", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { ticker } = req.params;
      await storage.removeFromWatchlist(req.session.userId, ticker);

      return res.json({
        success: true,
        message: "Ticker removed from watchlist",
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove from watchlist',
      });
    }
  });

  // AI Help Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      // Require authentication to prevent unauthorized API usage
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - please log in",
        });
      }

      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          message: "Invalid messages format",
        });
      }

      // Validate message objects have required fields
      const isValid = messages.every(
        (msg) =>
          msg &&
          typeof msg === "object" &&
          typeof msg.role === "string" &&
          typeof msg.content === "string" &&
          (msg.role === "user" || msg.role === "assistant")
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid message format - each message must have role and content",
        });
      }

      const systemPrompt = `You are a helpful AI assistant for the Futures Trade Copier Dashboard application. 
This is a trading platform that helps users:
- Copy trades from master accounts to follower accounts
- Track NinjaTrader and Tradovate platform accounts
- Monitor real-time trading activity and performance
- View market movers and track stocks in a watchlist
- Manage position scaling and trade execution
- Access economic calendars and social trading features

Be concise, friendly, and helpful. Focus on explaining features, answering questions about the platform, 
and helping users navigate the application. If users ask about specific trading strategies or financial advice, 
remind them that you provide platform assistance only, not financial advice.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      return res.json({
        success: true,
        message: reply,
      });
    } catch (error) {
      console.error('Error in AI chat:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get AI response',
      });
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws/market' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected to market data');

    const symbols = ['ES', 'NQ', 'YM', 'RTY'];
    const callbacks = new Map<string, (symbol: string, price: MarketPrice) => void>();

    symbols.forEach(symbol => {
      const callback = (sym: string, price: MarketPrice) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'price_update',
            symbol: sym,
            data: price,
          }));
        }
      };
      callbacks.set(symbol, callback);
      marketDataService.subscribe(symbol, callback);
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected from market data');
      callbacks.forEach((callback, symbol) => {
        marketDataService.unsubscribe(symbol, callback);
      });
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  });

  return server;
}
