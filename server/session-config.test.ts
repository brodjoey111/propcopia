import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import type { AddressInfo } from "node:net";
import { buildSessionCookieSettings } from "./session-config.ts";

function createTestApp(environment: string) {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: buildSessionCookieSettings(environment),
    }),
  );

  app.post("/api/auth/login", (req, res) => {
    req.session.userId = "user-1";
    req.session.username = "tester";
    req.session.save((error) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.json({
        success: true,
        user: {
          id: "user-1",
          username: "tester",
        },
      });
    });
  });

  app.post("/api/accounts", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    return res.json({
      success: true,
      account: {
        ...req.body,
        userId: req.session.userId,
      },
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    return res.json({
      success: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
      },
    });
  });

  return app;
}

async function startTestServer(environment = "development") {
  const app = createTestApp(environment);
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

test("authenticated account creation succeeds with the session cookie", async () => {
  const server = await startTestServer("development");

  try {
    const loginResponse = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "tester",
        password: "secret",
      }),
    });

    assert.equal(loginResponse.status, 200);
    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.doesNotMatch(setCookie, /Secure/i);

    const cookie = setCookie.split(";", 1)[0];
    const createResponse = await fetch(`${server.baseUrl}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        name: "Rithmic Follower",
        platform: "Rithmic",
        accountType: "follower",
      }),
    });

    assert.equal(createResponse.status, 200);
    const payload = await createResponse.json();
    assert.equal(payload.success, true);
    assert.equal(payload.account.userId, "user-1");
    assert.equal(payload.account.name, "Rithmic Follower");
  } finally {
    await server.close();
  }
});

test("authenticated auth check succeeds with the session cookie created during login", async () => {
  const server = await startTestServer("development");

  try {
    const loginResponse = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "tester",
        password: "secret",
      }),
    });

    assert.equal(loginResponse.status, 200);
    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie);

    const cookie = setCookie.split(";", 1)[0];
    const authResponse = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: {
        Cookie: cookie,
      },
    });

    assert.equal(authResponse.status, 200);
    const payload = await authResponse.json();
    assert.deepEqual(payload, {
      success: true,
      user: {
        id: "user-1",
        username: "tester",
      },
    });
  } finally {
    await server.close();
  }
});

test("unauthenticated account creation still returns 401", async () => {
  const server = await startTestServer("development");

  try {
    const createResponse = await fetch(`${server.baseUrl}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "No Session",
        platform: "Tradovate",
        accountType: "master",
      }),
    });

    assert.equal(createResponse.status, 401);
    const payload = await createResponse.json();
    assert.deepEqual(payload, {
      success: false,
      message: "Not authenticated",
    });
  } finally {
    await server.close();
  }
});

test("production session cookies remain secure and cross-site capable", () => {
  assert.deepEqual(buildSessionCookieSettings("production"), {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
});
