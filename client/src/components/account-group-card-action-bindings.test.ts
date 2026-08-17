import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupCardConnectionBindings,
  getAccountGroupCardDisconnectTarget,
} from "@/components/account-group-card-action-bindings";

test("account group card action bindings centralize account connect and disconnect wiring", () => {
  const source = readFileSync(
    "client/src/components/account-group-card-action-bindings.ts",
    "utf8",
  );

  assert.match(source, /buildAccountGroupCardConnectionBindings/);
  assert.match(source, /getAccountGroupCardDisconnectTarget/);
  assert.match(source, /onConnect: \(\) => onConnect\(account\.id\)/);
  assert.match(source, /disconnectTarget\.accountId/);
  assert.match(source, /disconnectTarget\.accountName/);
});

test("account group card action bindings map account callbacks to the expected account identifiers", () => {
  const calls: string[] = [];
  const bindings = buildAccountGroupCardConnectionBindings({
    account: {
      id: "acct-7",
      name: "Follower Seven",
    } as never,
    onConnect: (accountId) => {
      calls.push(`connect:${accountId}`);
    },
    onDisconnect: (accountId, name) => {
      calls.push(`disconnect:${accountId}:${name}`);
    },
  });

  bindings.onConnect();
  bindings.onDisconnect();

  assert.deepEqual(calls, [
    "connect:acct-7",
    "disconnect:acct-7:Follower Seven",
  ]);

  assert.deepEqual(
    getAccountGroupCardDisconnectTarget({
      id: "acct-8",
      name: "Follower Eight",
    } as never),
    {
      accountId: "acct-8",
      accountName: "Follower Eight",
    },
  );
});
