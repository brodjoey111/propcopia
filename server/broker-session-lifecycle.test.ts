import assert from "node:assert/strict";
import test from "node:test";
import {
  disconnectBrokerSessionQuietly,
  replaceBrokerSession,
} from "./broker-session-lifecycle";

test("quiet disconnect reports cleanup success without leaking errors", async () => {
  let disconnected = 0;
  assert.equal(await disconnectBrokerSessionQuietly({
    async disconnect() {
      disconnected += 1;
    },
  }), true);
  assert.equal(disconnected, 1);

  assert.equal(await disconnectBrokerSessionQuietly({
    async disconnect() {
      throw new Error("socket cleanup failed");
    },
  }), false);
});

test("replacing a broker session disconnects the previous session", async () => {
  let previousDisconnects = 0;
  const previous = {
    async disconnect() {
      previousDisconnects += 1;
    },
  };
  const next = { async disconnect() {} };
  const sessions = new Map([["user", previous]]);

  await replaceBrokerSession(sessions, "user", next);

  assert.equal(previousDisconnects, 1);
  assert.equal(sessions.get("user"), next);
});

test("registering the same broker session does not disconnect it", async () => {
  let disconnects = 0;
  const session = {
    async disconnect() {
      disconnects += 1;
    },
  };
  const sessions = new Map([["user", session]]);

  await replaceBrokerSession(sessions, "user", session);

  assert.equal(disconnects, 0);
  assert.equal(sessions.get("user"), session);
});
