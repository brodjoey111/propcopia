import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTradeHistoryQueryString,
  formatTradeHistoryStatus,
  getTradeHistoryStatusTone,
  summarizeTradeHistoryByDay,
  summarizeTradeHistoryBySymbol,
  summarizeTradeHistory,
  toTradeHistoryRows,
  type TradeHistoryApiRecord,
} from "./trade-history";

function createRecord(
  overrides: Partial<TradeHistoryApiRecord> = {},
): TradeHistoryApiRecord {
  return {
    historyId: "intent-1",
    intentId: "intent-1",
    masterAccountId: "master-1",
    masterAccountName: "Apex Master",
    masterFillId: "fill-1",
    followerAccountId: "follower-1",
    followerAccountName: "TopStep Follower",
    symbol: "ES",
    side: "BUY",
    quantity: 2,
    lifecycleStatus: "FILLED",
    averageFillPrice: 6400.25,
    createdAt: "2026-08-04T12:00:00.000Z",
    updatedAt: "2026-08-04T12:00:04.000Z",
    filledAt: "2026-08-04T12:00:04.000Z",
    ...overrides,
  };
}

test("formatTradeHistoryStatus humanizes lifecycle values", () => {
  assert.equal(formatTradeHistoryStatus("RULE_SKIPPED"), "Rule Skipped");
  assert.equal(formatTradeHistoryStatus("ACKNOWLEDGED"), "Acknowledged");
});

test("getTradeHistoryStatusTone maps filled to success and failures to failed", () => {
  assert.equal(getTradeHistoryStatusTone("FILLED"), "success");
  assert.equal(getTradeHistoryStatusTone("FAILED"), "failed");
  assert.equal(getTradeHistoryStatusTone("SENT"), "pending");
});

test("toTradeHistoryRows formats labels for the Trades page", () => {
  const row = toTradeHistoryRows([
    createRecord({
      events: [
        {
          type: "execution.sent",
          timestamp: "2026-08-04T12:00:02.000Z",
          message: "Execution sent to broker",
        },
      ],
    }),
  ])[0];

  assert.equal(row.masterAccountLabel, "Apex Master");
  assert.equal(row.followerAccountLabel, "TopStep Follower");
  assert.equal(row.statusLabel, "Filled");
  assert.equal(row.statusTone, "success");
  assert.equal(row.priceLabel, "$6,400.25");
  assert.equal(row.events.length, 1);
  assert.equal(row.detail.masterFillId, "fill-1");
});

test("toTradeHistoryRows falls back to rule metadata for rule-only events", () => {
  const row = toTradeHistoryRows([
    createRecord({
      historyId: "rule:fill-2:follower-2",
      intentId: undefined,
      masterAccountId: undefined,
      masterAccountName: null,
      lifecycleStatus: "RULE_SKIPPED",
      ruleReasonCode: "SYMBOL_BLOCKED",
      averageFillPrice: undefined,
    }),
  ])[0];

  assert.equal(row.masterAccountLabel, "Rule Event");
  assert.equal(row.statusTone, "failed");
  assert.equal(row.errorLabel, "SYMBOL_BLOCKED");
  assert.equal(row.priceLabel, "Pending");
});

test("summarizeTradeHistory counts current lifecycle buckets", () => {
  const summary = summarizeTradeHistory([
    createRecord({ lifecycleStatus: "FILLED" }),
    createRecord({ historyId: "2", lifecycleStatus: "FAILED" }),
    createRecord({ historyId: "3", lifecycleStatus: "SENT" }),
    createRecord({ historyId: "4", lifecycleStatus: "RULE_REJECTED" }),
  ]);

  assert.deepEqual(summary, {
    total: 4,
    filled: 1,
    failed: 1,
    pending: 1,
    skippedOrRejected: 1,
  });
});

test("buildTradeHistoryQueryString encodes status, query, and limit", () => {
  assert.equal(
    buildTradeHistoryQueryString({
      status: "pending",
      query: "ES follower",
      limit: 250,
    }),
    "?limit=250&status=QUEUED%2CSENT%2CACKNOWLEDGED%2CINTENT_CREATED&q=ES+follower",
  );
});

test("summarizeTradeHistoryBySymbol groups and sorts execution activity", () => {
  const summary = summarizeTradeHistoryBySymbol([
    createRecord({ symbol: "ES", lifecycleStatus: "FILLED" }),
    createRecord({ historyId: "2", symbol: "NQ", lifecycleStatus: "FAILED" }),
    createRecord({ historyId: "3", symbol: "ES", lifecycleStatus: "SENT" }),
    createRecord({ historyId: "4", symbol: "ES", lifecycleStatus: "RULE_REJECTED" }),
  ]);

  assert.deepEqual(summary, [
    {
      symbol: "ES",
      total: 3,
      filled: 1,
      pending: 1,
      failed: 1,
    },
    {
      symbol: "NQ",
      total: 1,
      filled: 0,
      pending: 0,
      failed: 1,
    },
  ]);
});

test("summarizeTradeHistoryByDay groups the last five days of execution activity", () => {
  const summary = summarizeTradeHistoryByDay([
    createRecord({
      historyId: "day-1",
      lifecycleStatus: "FILLED",
      filledAt: "2026-08-04T14:00:00.000Z",
      updatedAt: "2026-08-04T14:00:00.000Z",
    }),
    createRecord({
      historyId: "day-2",
      lifecycleStatus: "FAILED",
      filledAt: undefined,
      failedAt: "2026-08-03T14:00:00.000Z",
      updatedAt: "2026-08-03T14:00:00.000Z",
    }),
    createRecord({
      historyId: "day-3",
      lifecycleStatus: "QUEUED",
      filledAt: undefined,
      queuedAt: "2026-08-03T15:00:00.000Z",
      updatedAt: "2026-08-03T15:00:00.000Z",
    }),
  ], 3);

  assert.deepEqual(
    summary.map((day) => ({
      dateKey: day.dateKey,
      total: day.total,
      filled: day.filled,
      pending: day.pending,
      failed: day.failed,
    })),
    [
      { dateKey: "2026-08-02", total: 0, filled: 0, pending: 0, failed: 0 },
      { dateKey: "2026-08-03", total: 2, filled: 0, pending: 1, failed: 1 },
      { dateKey: "2026-08-04", total: 1, filled: 1, pending: 0, failed: 0 },
    ],
  );
});
