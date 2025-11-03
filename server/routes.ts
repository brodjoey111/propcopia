import type { Express } from "express";
import { createServer, type Server } from "http";
import { TradovateAPI } from "./tradovate-api";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUserSchema } from "@shared/schema";

const tradovateInstances = new Map<string, TradovateAPI>();

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

      // Set session
      if (req.session) {
        req.session.userId = user.id;
        req.session.username = user.username;
      }

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

  app.get("/api/auth/me", (req, res) => {
    if (req.session?.userId) {
      return res.json({
        success: true,
        user: {
          id: req.session.userId,
          username: req.session.username,
        },
      });
    }
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
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

  return server;
}
