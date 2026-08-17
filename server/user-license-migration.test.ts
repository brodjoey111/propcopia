import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("license migration adds idempotent user billing fields and unique external references", () => {
  const migration = readFileSync("migrations/0025_add_user_license_state.sql", "utf8");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS license_plan text NOT NULL DEFAULT 'development'/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS license_status text NOT NULL DEFAULT 'active'/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS stripe_customer_id text/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS stripe_subscription_id text/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_unique_idx/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_id_unique_idx/);
});

test("license migration runner uses the Phase 10 migration", () => {
  const runner = readFileSync("server/run-user-license-migration.ts", "utf8");
  assert.match(runner, /0025_add_user_license_state\.sql/);
  assert.match(runner, /User license-state migration applied successfully/);
});
