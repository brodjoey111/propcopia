import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("trade history migration creates user-owned restart-safe storage", () => {
  const sql = readFileSync("migrations/0024_create_trade_history_records.sql", "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS trade_history_records/i);
  assert.match(sql, /user_id varchar NOT NULL/i);
  assert.match(sql, /process_instance_id varchar NOT NULL/i);
  assert.match(sql, /record_json text NOT NULL/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS trade_history_records_user_updated_idx/i);
});
