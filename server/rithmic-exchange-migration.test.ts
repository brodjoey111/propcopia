import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  import.meta.dirname,
  '..',
  'migrations',
  '0003_add_rithmic_exchange.sql',
);

test('Rithmic exchange migration adds the saved exchange column safely', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /ADD COLUMN IF NOT EXISTS "rithmic_exchange" text/);
  assert.ok(!/DROP TABLE|DROP COLUMN/i.test(sql));
});
