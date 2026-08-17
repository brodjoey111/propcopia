import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("global risk settings migration adds the server-owned policy column idempotently", () => {
  const migration = readFileSync(
    "migrations/0023_add_global_risk_settings_json.sql",
    "utf8",
  );

  assert.match(migration, /ALTER TABLE users/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS global_risk_settings_json text/);
});

test("global risk settings migration runner uses the idempotent migration file", () => {
  const runner = readFileSync("server/run-global-risk-settings-migration.ts", "utf8");

  assert.match(runner, /0023_add_global_risk_settings_json\.sql/);
  assert.match(runner, /Global risk-settings migration applied successfully/);
});
