import test from "node:test";
import assert from "node:assert/strict";

import { RithmicReconnectValidationStore } from "./rithmic-reconnect-validation";
import { reconnectSavedRithmicTestAccount } from "./rithmic-saved-reconnect-service";

type TestSession = {
  authenticate(): Promise<{ success: boolean; message: string }>;
  disconnect(): Promise<void>;
  disconnectCalls: number;
};

function createSession(authentication = { success: true, message: "Connected" }): TestSession {
  return {
    disconnectCalls: 0,
    async authenticate() {
      return authentication;
    },
    async disconnect() {
      this.disconnectCalls += 1;
    },
  };
}

function createAccount(overrides: Partial<{
  id: string;
  rithmicUsername: string | null;
  rithmicPassword: string | null;
  rithmicEnvironment: string | null;
  rithmicAccountId: string | null;
}> = {}) {
  return {
    id: "account-1",
    rithmicUsername: "test-user",
    rithmicPassword: "test-password",
    rithmicEnvironment: "test",
    rithmicAccountId: "old-id",
    ...overrides,
  };
}

test("saved reconnect authenticates, refreshes identity, and records validation", async () => {
  const validationStore = new RithmicReconnectValidationStore();
  const sessions = new Map<string, TestSession>();
  const session = createSession();
  let receivedCredentials: unknown;

  const result = await reconnectSavedRithmicTestAccount({
    account: createAccount(),
    systemName: "Rithmic Test",
    sessions,
    validationStore,
    createSession(credentials) {
      receivedCredentials = credentials;
      return session;
    },
    async refreshIdentity(account) {
      return { ...account, rithmicAccountId: "refreshed-id" };
    },
    now: () => "2026-08-17T12:00:00.000Z",
  });

  assert.deepEqual(receivedCredentials, {
    username: "test-user",
    password: "test-password",
    environment: "test",
    systemName: "Rithmic Test",
  });
  assert.deepEqual(result, {
    success: true,
    account: { ...createAccount(), rithmicAccountId: "refreshed-id" },
  });
  assert.equal(sessions.get("test-user"), session);
  assert.deepEqual(validationStore.get("account-1"), {
    validatedAt: "2026-08-17T12:00:00.000Z",
    source: "saved_connect",
  });
});

test("saved reconnect rejects live accounts before creating a session", async () => {
  let createCalls = 0;

  const result = await reconnectSavedRithmicTestAccount({
    account: createAccount({ rithmicEnvironment: "live" }),
    systemName: "Rithmic Test",
    sessions: new Map(),
    validationStore: new RithmicReconnectValidationStore(),
    createSession() {
      createCalls += 1;
      return createSession();
    },
    async refreshIdentity(account) {
      return account;
    },
  });

  assert.deepEqual(result, {
    success: false,
    message: "Only Rithmic Test saved accounts can be connected during this phase.",
  });
  assert.equal(createCalls, 0);
});

test("saved reconnect reports missing credentials before creating a session", async () => {
  let createCalls = 0;

  const result = await reconnectSavedRithmicTestAccount({
    account: createAccount({ rithmicPassword: null }),
    systemName: "Rithmic Test",
    sessions: new Map(),
    validationStore: new RithmicReconnectValidationStore(),
    createSession() {
      createCalls += 1;
      return createSession();
    },
    async refreshIdentity(account) {
      return account;
    },
  });

  assert.deepEqual(result, {
    success: false,
    message: "Rithmic credentials are missing for this saved account.",
  });
  assert.equal(createCalls, 0);
});

test("failed authentication disconnects the new session and leaves the cache unchanged", async () => {
  const previousSession = createSession();
  const failedSession = createSession({ success: false, message: "Login rejected" });
  const sessions = new Map([["test-user", previousSession]]);
  const validationStore = new RithmicReconnectValidationStore();

  const result = await reconnectSavedRithmicTestAccount({
    account: createAccount(),
    systemName: "Rithmic Test",
    sessions,
    validationStore,
    createSession: () => failedSession,
    async refreshIdentity(account) {
      return account;
    },
  });

  assert.deepEqual(result, { success: false, message: "Login rejected" });
  assert.equal(failedSession.disconnectCalls, 1);
  assert.equal(previousSession.disconnectCalls, 0);
  assert.equal(sessions.get("test-user"), previousSession);
  assert.equal(validationStore.get("account-1"), undefined);
});

test("identity refresh failure disconnects the new session without replacing the previous one", async () => {
  const previousSession = createSession();
  const newSession = createSession();
  const sessions = new Map([["test-user", previousSession]]);

  await assert.rejects(
    reconnectSavedRithmicTestAccount({
      account: createAccount(),
      systemName: "Rithmic Test",
      sessions,
      validationStore: new RithmicReconnectValidationStore(),
      createSession: () => newSession,
      async refreshIdentity() {
        throw new Error("Database refresh failed");
      },
    }),
    /Database refresh failed/,
  );

  assert.equal(newSession.disconnectCalls, 1);
  assert.equal(previousSession.disconnectCalls, 0);
  assert.equal(sessions.get("test-user"), previousSession);
});

test("successful reconnect disconnects and replaces an older cached session", async () => {
  const previousSession = createSession();
  const newSession = createSession();
  const sessions = new Map([["test-user", previousSession]]);

  const result = await reconnectSavedRithmicTestAccount({
    account: createAccount(),
    systemName: "Rithmic Test",
    sessions,
    validationStore: new RithmicReconnectValidationStore(),
    createSession: () => newSession,
    async refreshIdentity(account) {
      return account;
    },
  });

  assert.equal(result.success, true);
  assert.equal(previousSession.disconnectCalls, 1);
  assert.equal(newSession.disconnectCalls, 0);
  assert.equal(sessions.get("test-user"), newSession);
});
