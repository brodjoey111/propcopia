import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/trade-copy-engine.ts", "utf8");

test("trade-copy engine routes runtime failure paths through the operational logger", () => {
  assert.match(source, /import \{ operationalLogger \} from '\.\/operational-logger';/);
  assert.match(source, /operationalLogger\.error\('trade_copy\.master_websocket_error'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.follower_websocket_error'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.follower_reconnect_exhausted'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.follower_fill_unmatched'/);
  assert.match(source, /operationalLogger\.error\('trade_copy\.follower_fill_record_failed'/);
  assert.match(source, /operationalLogger\.error\('trade_copy\.master_fill_processing_failed'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.rule_rejected'/);
  assert.match(source, /operationalLogger\.error\('trade_copy\.enqueue_failed'/);
  assert.match(source, /operationalLogger\.error\('trade_copy\.execution_failed'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.execution_cancelled'/);
  assert.match(source, /operationalLogger\.error\('trade_copy\.copy_to_follower_failed'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.copy_all_followers_failed'/);
  assert.match(source, /operationalLogger\.warn\('trade_copy\.rithmic_master_fill_ignored'/);
  assert.doesNotMatch(source, /Failed to record follower fill for intent/);
  assert.doesNotMatch(source, /Error processing master fill:/);
  assert.doesNotMatch(source, /Failed to enqueue for /);
  assert.doesNotMatch(source, /Error copying to /);
  assert.doesNotMatch(source, /Trade .* failed to copy to all followers/);
});
