import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");

test("route broker registries never expose direct username-only access", () => {
  for (const registry of ["tradovateInstances", "tradeifyInstances", "rithmicInstances"]) {
    assert.doesNotMatch(source, new RegExp(`${registry}\\.(?:get|set|delete)\\(`));
  }
});

test("broker connection tests store sessions under the authenticated user", () => {
  assert.match(source, /tradovateInstances\.forUser\(req\.session\.userId\)\.set\(username, tradovateAPI\)/);
  assert.match(source, /tradeifyInstances\.forUser\(req\.session\.userId\)\.set\(username, tradeifyAPI\)/);
  assert.match(source, /replaceBrokerSession\(rithmicInstances\.forUser\(req\.session\.userId\), username, rithmicAPI\)/);
});

test("trade copy and kill switch resolve only the authenticated user's sessions", () => {
  assert.match(source, /tradovateInstances: tradovateInstances\.forUser\(userId\)/);
  assert.match(source, /const userRithmicInstances = rithmicInstances\.forUser\(userId\)/);
  assert.match(source, /tradovateInstances\.forUser\(userId\)\.get\(account\.tradovateUsername\)/);
  assert.match(source, /rithmicInstances\.forUser\(userId\)\.get\(account\.rithmicUsername\)/);
});
