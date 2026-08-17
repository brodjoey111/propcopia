import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { buildSessionCookieSettings } from "./session-config";
import { resetStaleAccountConnections } from "./startup-connection-reconciliation";
import { accountConnectionRecoveryStore } from "./account-connection-recovery-store";
import { buildLivenessPayload, buildRuntimeConfig } from "./runtime-config";
import { operationalLogger } from "./operational-logger";
import { buildRequestLogDecision } from "./request-observability";
import { normalizeHttpError } from "./http-error-boundary";

const app = express();
const startedAtMs = Date.now();
const runtimeConfig = buildRuntimeConfig(process.env);

// Liveness stays ahead of sessions and database-backed middleware.
app.get("/api/health", (_req, res) => {
  return res.json(buildLivenessPayload(runtimeConfig, startedAtMs));
});

// Trust Replit proxy for secure cookies
app.set('trust proxy', 1);

// Session type definitions
declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Session configuration with PostgreSQL store
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const cookieSettings = buildSessionCookieSettings(app.get("env"));

app.use(
  session({
    secret: runtimeConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: pgPool,
      createTableIfMissing: true,
      tableName: 'session',
    }),
    cookie: cookieSettings,
  })
);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const userId = req.session.userId;

  res.on("finish", () => {
    const decision = buildRequestLogDecision({
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userId,
    });
    if (!decision) {
      return;
    }

    if (decision.level === "error") {
      operationalLogger.error(decision.event, decision.context);
    } else if (decision.level === "warn") {
      operationalLogger.warn(decision.event, decision.context);
    } else {
      operationalLogger.info(decision.event, decision.context);
    }
  });

  next();
});

(async () => {
  const resetConnectionCount = await resetStaleAccountConnections(undefined, ({ id, userId }) => {
    accountConnectionRecoveryStore.startupOffline(userId, id);
  });
  if (resetConnectionCount > 0) {
    log(`restored ${resetConnectionCount} saved account connection(s) to a safe offline state`);
  }

  const server = await registerRoutes(app);

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const normalized = normalizeHttpError(err);
    const context = {
      method: req.method,
      path: req.path,
      statusCode: normalized.statusCode,
      userId: req.session.userId,
      error: err,
    };
    if (normalized.logLevel === "error") {
      operationalLogger.error("http.unhandled_error", context);
    } else {
      operationalLogger.warn("http.request_error", context);
    }

    return res.status(normalized.statusCode).json({ message: normalized.publicMessage });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = runtimeConfig.port;
  server.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
  });
})();
