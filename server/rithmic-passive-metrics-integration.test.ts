import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/account-live-metrics-service.ts", "utf8");
const rithmicSnapshot = source.slice(
  source.indexOf("async function buildRithmicSnapshot"),
  source.indexOf("async function buildSnapshotForAccount"),
);

test("dashboard Rithmic metrics use passive cached session data", () => {
  assert.match(rithmicSnapshot, /api\.isAuthenticated\(\)/);
  assert.match(rithmicSnapshot, /api\.getDiscoveredAccounts\(\)/);
  assert.doesNotMatch(rithmicSnapshot, /testConnection\(/);
});
