import type { Express } from "express";
import { createServer, type Server } from "http";
import { TradovateAPI } from "./tradovate-api";

const tradovateInstances = new Map<string, TradovateAPI>();

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  app.post("/api/tradovate/test-connection", async (req, res) => {
    try {
      const { username, password, cid, secret, environment } = req.body;

      if (!username || !password || !cid || !secret) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username, password, cid, secret"
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
