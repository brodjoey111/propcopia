import assert from "node:assert/strict";
import test from "node:test";

import { AccountConnectionRecoveryStore } from "./account-connection-recovery-store";

test("recovery store tracks attempts and terminal outcomes by user", () => {
  const store = new AccountConnectionRecoveryStore();
  store.begin("user-1", "account-1", "2026-08-17T12:00:00.000Z");
  store.failed("user-1", "account-1", "Login rejected", "2026-08-17T12:00:01.000Z");
  store.begin("user-1", "account-1", "2026-08-17T12:01:00.000Z");
  store.recovered("user-1", "account-1", "2026-08-17T12:01:01.000Z");
  store.disconnected("user-2", "account-2", "2026-08-17T12:02:00.000Z");

  const records = store.listForUser("user-1");
  assert.equal(records.length, 1);
  assert.equal(records[0].status, "recovered");
  assert.equal(records[0].attempts, 2);
  assert.equal(records[0].message, undefined);
  assert.equal(store.listForUser("user-2")[0].status, "disconnected");
});

test("startup recovery records explain that no live session was restored", () => {
  const store = new AccountConnectionRecoveryStore();
  store.startupOffline("user-1", "account-1", "2026-08-17T12:00:00.000Z");

  const record = store.listForUser("user-1")[0];
  assert.equal(record.status, "startup_offline");
  assert.match(record.message ?? "", /safe offline state/i);
  assert.equal(record.attempts, 0);
});
