import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  import.meta.dirname,
  '..',
  'migrations',
  '0001_accounts_schema_catchup.sql',
);

test('accounts schema catch-up migration adds the missing additive columns safely', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /ADD COLUMN IF NOT EXISTS "copy_sizing_mode" text DEFAULT 'MULTIPLIER'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "reverse_copying" boolean DEFAULT false/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "allowed_directions" text DEFAULT 'both'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "on_breach_action" text DEFAULT 'pause'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "trading_days" text\[\]/);
  assert.ok(!/DROP TABLE|DROP COLUMN/i.test(sql));
});
