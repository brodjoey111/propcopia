import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { TradovateAPI } from "./tradovate-api";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUserSchema, updateUserProfileSchema, insertWatchlistItemSchema } from "@shared/schema";
import { marketDataService, type MarketPrice } from "./market-data";
import OpenAI from "openai";

const tradovateInstances = new Map<string, TradovateAPI>();

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

      // If no CID/secret provided, simulate successful connection for demo purposes
      if (!cid || !secret) {
        return res.json({
          success: true,
          message: "Simulated connection successful (no live credentials provided)",
          authData: {
            userId: `sim-${username}`,
            tokenExpiration: new Date(Date.now() + 3600000).toISOString(),
          },
          accounts: [
            { id: '1', name: `${username} - Simulated Account 1` },
            { id: '2', name: `${username} - Simulated Account 2` },
          ],
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
      const mockTraders = [
        {
          id: '1',
          username: 'sarahtrader',
          name: 'Sarah Martinez',
          positions: [
            { symbol: 'ES', quantity: 5, entryPrice: 5825.50, currentPrice: 0 },
            { symbol: 'NQ', quantity: 2, entryPrice: 20450.00, currentPrice: 0 },
          ],
          totalPnl: 0,
          returnPercent: 0,
          isVerified: true,
        },
        {
          id: '2',
          username: 'mikethetrader',
          name: 'Mike Chen',
          positions: [
            { symbol: 'ES', quantity: 3, entryPrice: 5810.00, currentPrice: 0 },
            { symbol: 'YM', quantity: 1, entryPrice: 42950.00, currentPrice: 0 },
          ],
          totalPnl: 0,
          returnPercent: 0,
          isVerified: true,
        },
        {
          id: '3',
          username: 'jordanfx',
          name: 'Jordan Lee',
          positions: [
            { symbol: 'NQ', quantity: 4, entryPrice: 20480.00, currentPrice: 0 },
          ],
          totalPnl: 0,
          returnPercent: 0,
          isVerified: false,
        },
        {
          id: '4',
          username: 'alexfutures',
          name: 'Alex Thompson',
          positions: [
            { symbol: 'RTY', quantity: 8, entryPrice: 2095.50, currentPrice: 0 },
            { symbol: 'ES', quantity: 2, entryPrice: 5830.00, currentPrice: 0 },
          ],
          totalPnl: 0,
          returnPercent: 0,
          isVerified: false,
        },
        {
          id: '5',
          username: 'emilytrades',
          name: 'Emily Rodriguez',
          positions: [
            { symbol: 'NQ', quantity: 3, entryPrice: 20490.00, currentPrice: 0 },
            { symbol: 'YM', quantity: 2, entryPrice: 42980.00, currentPrice: 0 },
          ],
          totalPnl: 0,
          returnPercent: 0,
          isVerified: true,
        },
      ];

      const prices = marketDataService.getAllPrices();
      
      const tradersWithPnl = mockTraders.map(trader => {
        let totalPnl = 0;
        const startingCapital = 50000;

        const updatedPositions = trader.positions.map(position => {
          const currentPrice = prices.get(position.symbol)?.price || position.entryPrice;
          const pnl = (currentPrice - position.entryPrice) * position.quantity * 50;
          totalPnl += pnl;

          return {
            ...position,
            currentPrice,
            pnl,
          };
        });

        const returnPercent = (totalPnl / startingCapital) * 100;

        return {
          ...trader,
          positions: updatedPositions,
          totalPnl,
          returnPercent,
        };
      });

      const sortedTraders = tradersWithPnl.sort((a, b) => b.returnPercent - a.returnPercent);

      return res.json({
        success: true,
        data: sortedTraders,
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // Alpha Vantage API helper - Get top gainers/losers
  async function fetchMarketMovers(type: 'gainers' | 'losers' | 'actives') {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
    }
    
    // Alpha Vantage has a TOP_GAINERS_LOSERS function
    const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Alpha Vantage returns: { top_gainers: [], top_losers: [], most_actively_traded: [] }
    if (data.Note || data['Error Message']) {
      throw new Error(data.Note || data['Error Message'] || 'API rate limit exceeded');
    }
    
    if (type === 'gainers') {
      return data.top_gainers || [];
    } else if (type === 'losers') {
      return data.top_losers || [];
    } else {
      return data.most_actively_traded || [];
    }
  }

  // Combined Market Movers endpoint using Alpha Vantage
  app.get("/api/market-movers", async (req, res) => {
    try {
      const type = (req.query.type as string || 'gainers') as 'gainers' | 'losers' | 'actives';
      
      const movers = await fetchMarketMovers(type);

      // Transform Alpha Vantage data to match our frontend format
      const transformedData = movers.slice(0, 100).map((stock: any) => {
        const currentPrice = parseFloat(stock.price);
        const changeAmount = parseFloat(stock.change_amount || '0');
        const openPrice = currentPrice - changeAmount; // Calculate opening price
        
        return {
          symbol: stock.ticker,
          name: stock.ticker, // Alpha Vantage doesn't provide company name in this endpoint
          price: currentPrice,
          changesPercentage: parseFloat(stock.change_percentage?.replace('%', '') || '0'),
          change: changeAmount,
          volume: parseInt(stock.volume || '0'),
          exchange: 'US', // Alpha Vantage data is US stocks
          open: !isNaN(openPrice) ? openPrice : undefined,
          close: !isNaN(currentPrice) ? currentPrice : undefined,
        };
      });

      return res.json({
        success: true,
        data: transformedData,
      });
    } catch (error) {
      console.error('Error fetching market movers:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch market movers',
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
