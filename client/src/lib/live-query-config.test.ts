import assert from "node:assert/strict";
import test from "node:test";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
  OPERATOR_QUERY_POLL_MS,
  PASSIVE_QUERY_POLL_MS,
  SESSION_STATUS_POLL_MS,
} from "./live-query-config";

test("query refresh budgets prioritize safety and active sessions", () => {
  assert.equal(SESSION_STATUS_POLL_MS, 10_000);
  assert.equal(LIVE_QUERY_POLL_MS, 15_000);
  assert.equal(OPERATOR_QUERY_POLL_MS, 30_000);
  assert.equal(PASSIVE_QUERY_POLL_MS, 60_000);
  assert.ok(SESSION_STATUS_POLL_MS < LIVE_QUERY_POLL_MS);
  assert.ok(LIVE_QUERY_POLL_MS < OPERATOR_QUERY_POLL_MS);
  assert.ok(OPERATOR_QUERY_POLL_MS < PASSIVE_QUERY_POLL_MS);
  assert.ok(LIVE_QUERY_STALE_MS <= LIVE_QUERY_POLL_MS);
});
