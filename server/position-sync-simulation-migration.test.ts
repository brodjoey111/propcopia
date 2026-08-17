import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("position sync simulation migration adds auditable evidence columns safely", () => {
  const migration = readFileSync(
    "migrations/0022_add_position_sync_simulation_evidence.sql",
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS position_sync_reviews/);
  assert.match(migration, /ALTER TABLE position_sync_reviews/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS operator_history_json text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS simulation_id text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS simulation_fingerprint text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS simulation_source_generated_at timestamp/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS simulation_plan_json text/);
});

test("position sync simulation migration runner uses the idempotent migration file", () => {
  const runner = readFileSync(
    "server/run-position-sync-simulation-evidence-migration.ts",
    "utf8",
  );

  assert.match(runner, /0022_add_position_sync_simulation_evidence\.sql/);
  assert.match(runner, /db\.execute\(sql\.raw\(statement\)\)/);
  assert.match(runner, /simulation-evidence migration applied successfully/);
});
