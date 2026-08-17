import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { TradeHistoryRecord } from "./trade-history-store";

import { summarizeExecutionRecovery } from "./runtime-overview-service";

function createTradeRecord(
  overrides: Partial<TradeHistoryRecord> = {},
): TradeHistoryRecord {
  return {
    historyId: "intent-1",
    intentId: "intent-1",
    masterAccountId: "master-1",
    masterFillId: "fill-1",
    followerAccountId: "follower-1",
    symbol: "ES",
    side: "BUY",
    quantity: 2,
    lifecycleStatus: "ACKNOWLEDGED",
    brokerOrderId: "BRK-1",
    createdAt: "2026-08-12T11:40:00.000Z",
    updatedAt: "2026-08-12T11:45:00.000Z",
    acknowledgedAt: "2026-08-12T11:45:00.000Z",
    events: [],
    ...overrides,
  };
}

test("dashboard runtime overview keeps copy-group payloads lightweight", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /runtimeSummary:\s*buildCopyGroupRuntimeSummary\(/);
  assert.match(source, /Restored offline/);
  assert.match(source, /startsWith\("Recovered copy group "\)/);
  assert.match(source, /activityPreview:\s*recentActivity\.slice\(0,\s*3\)/);
  assert.doesNotMatch(source, /statistics:\s*runtime\.statistics/);
  assert.doesNotMatch(source, /health:\s*runtime\.health/);
  assert.doesNotMatch(source, /activity:\s*runtime\s*\?\s*input\.getRecentActivity/);
});

test("dashboard runtime overview sends execution widget summaries instead of raw recent trade records", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /attentionCards:\s*buildDashboardExecutionAttentionCards\(recentTrades\.slice\(0,\s*4\)\)/);
  assert.match(source, /recentPathRows:\s*buildDashboardExecutionPathRows\(recentTrades\.slice\(0,\s*4\),\s*3\)/);
  assert.doesNotMatch(source, /recentRecords:\s*recentTrades\.slice\(0,\s*4\)/);
});

test("dashboard runtime overview includes a compact headline summary for account and position cards", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /dashboardSummary:\s*\{/);
  assert.match(source, /totalAccounts:\s*input\.userAccounts\.length/);
  assert.match(source, /connectedAccounts:\s*input\.userAccounts\.filter\(\(account\) => account\.isConnected\)\.length/);
  assert.match(source, /totalBuyingPower:\s*totalBalance \* 1\.92/);
  assert.match(source, /totalOpenPositions:\s*accountsOverview\.positionSnapshot\.summary\.totalOpenPositions/);
});

test("dashboard runtime overview exposes compact trade logger observability for later health panels", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /import \{ tradeLogger, type TradeLoggerStats \} from "\.\/trade-logger";/);
  assert.match(source, /tradeLogger:\s*TradeLoggerStats;/);
  assert.match(source, /tradeLogger:\s*tradeLogger\.getStats\(\),/);
});

test("summarizeExecutionRecovery adds checkpoint and recovery-window context for failed, stale, and partial items", () => {
  const result = summarizeExecutionRecovery(
    [
      createTradeRecord({
        historyId: "failed-reviewed",
        lifecycleStatus: "FAILED",
        failedAt: "2026-08-12T11:50:00.000Z",
        updatedAt: "2026-08-12T11:50:00.000Z",
        lastErrorMessage: "Broker rejected order",
        reviewStatus: "reviewed",
        reviewNote: "Checked retry window",
        reviewedAt: "2026-08-12T11:55:00.000Z",
      }),
      createTradeRecord({
        historyId: "ack-stale",
        lifecycleStatus: "ACKNOWLEDGED",
        acknowledgedAt: "2026-08-12T11:45:00.000Z",
        updatedAt: "2026-08-12T11:45:00.000Z",
        brokerOrderId: "BRK-22",
      }),
      createTradeRecord({
        historyId: "partial-fresh",
        lifecycleStatus: "PARTIALLY_FILLED",
        updatedAt: "2026-08-12T12:08:00.000Z",
        filledQuantity: 1,
        remainingQuantity: 1,
        partialFillCount: 2,
        brokerOrderId: "BRK-33",
      }),
    ],
    {
      now: "2026-08-12T12:10:00.000Z",
      staleThresholdMinutes: 5,
      limit: 5,
    },
  );

  assert.equal(result.items[0]?.historyId, "failed-reviewed");
  assert.equal(result.items[0]?.checkpoint.label, "Execution failed");
  assert.equal(result.items[0]?.recoveryWindow.label, "Review captured");
  assert.equal(result.items[1]?.historyId, "ack-stale");
  assert.equal(result.items[1]?.checkpoint.label, "Broker acknowledged");
  assert.equal(result.items[1]?.recoveryWindow.label, "Fill update overdue");
  assert.equal(
    result.items[1]?.recoveryWindow.detail,
    "25 minutes since broker acknowledgement (stale window 5m).",
  );
  assert.equal(result.items[2]?.historyId, "partial-fresh");
  assert.equal(result.items[2]?.checkpoint.label, "Partial fill active");
  assert.equal(
    result.items[2]?.checkpoint.detail,
    "1/2 filled with 1 contract still open after 2 partial fills.",
  );
  assert.equal(result.items[2]?.recoveryWindow.label, "Fresh partial window");
});
