import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDashboardExecutionAttentionCards,
  buildDashboardExecutionPathRows,
  buildTradeJourneyRows,
  buildTradeLifecycleStageCards,
  buildTradeHistoryQueryString,
  describeTradeLifecycleOverview,
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

function isoDaysAgo(daysAgo: number, hour: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
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
  assert.equal(row.detail.progressLabel, "2/2 filled");
  assert.equal(row.detail.fillCountLabel, "1 final fill");
  assert.deepEqual(row.executionSummary, {
    state: "complete",
    attention: "ok",
    headline: "Filled",
    detail: "2/2 contracts complete",
  });
  assert.deepEqual(
    row.detail.stageFlow.map((stage) => `${stage.label}:${stage.state}`),
    [
      "Created:done",
      "Queued:done",
      "Sent:done",
      "Acknowledged:done",
      "Partial:done",
      "Filled:active",
    ],
  );
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
  assert.equal(row.errorLabel, "Symbol blocked");
  assert.equal(row.priceLabel, "Pending");
  assert.equal(row.detail.stageFlow.at(-1)?.label, "Skipped");
  assert.equal(row.detail.stageFlow.at(-1)?.state, "active");
});

test("toTradeHistoryRows preserves server-provided friendly rule messages", () => {
  const row = toTradeHistoryRows([
    createRecord({
      historyId: "rule:fill-3:follower-3",
      intentId: undefined,
      masterAccountId: undefined,
      masterAccountName: null,
      lifecycleStatus: "RULE_REJECTED",
      ruleReasonCode: "RISK_LIMIT_BREACHED",
      lastErrorMessage: "Risk limit breached",
      averageFillPrice: undefined,
    }),
  ])[0];

  assert.equal(row.errorLabel, "Risk limit breached");
});

test("toTradeHistoryRows carries reviewed failure notes into the expanded detail view", () => {
  const row = toTradeHistoryRows([
    createRecord({
      lifecycleStatus: "FAILED",
      failedAt: "2026-08-11T14:01:00.000Z",
      updatedAt: "2026-08-11T14:05:00.000Z",
      lastErrorMessage: "Broker down",
      reviewStatus: "reviewed",
      reviewNote: "Checked broker logs and left for retry review",
      reviewedAt: "2026-08-11T14:05:00.000Z",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T14:02:00.000Z",
          reason: "Picked up failed execution",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T14:04:00.000Z",
          reason: "Took over broker review",
        },
      ],
    }),
  ])[0];

  assert.equal(row.detail.reviewStatus, "reviewed");
  assert.equal(row.detail.reviewNote, "Checked broker logs and left for retry review");
  assert.equal(row.detail.reviewedAt, "2026-08-11T14:05:00.000Z");
  assert.equal(row.detail.operatorName, "joseph");
  assert.equal(row.detail.operatorHistory?.length, 2);
  assert.equal(row.detail.operatorHistory?.[1]?.reason, "Took over broker review");
});

test("toTradeHistoryRows builds partial-fill progress details for expanded record view", () => {
  const row = toTradeHistoryRows([
    createRecord({
      lifecycleStatus: "PARTIALLY_FILLED",
      filledAt: undefined,
      partialFillCount: 2,
      filledQuantity: 1,
      remainingQuantity: 1,
      averageFillPrice: 6400.5,
      updatedAt: "2026-08-04T12:00:05.000Z",
    }),
  ])[0];

  assert.equal(row.detail.requestedQuantityLabel, "2");
  assert.equal(row.detail.filledQuantityLabel, "1");
  assert.equal(row.detail.remainingQuantityLabel, "1");
  assert.equal(row.detail.progressLabel, "1/2 filled");
  assert.equal(row.detail.fillCountLabel, "2 partial fills");
  assert.deepEqual(row.executionSummary, {
    state: "partial",
    attention: "watch",
    headline: "Partial fill",
    detail: "1/2 filled, 1 remaining",
  });
  assert.deepEqual(
    row.detail.stageFlow.map((stage) => `${stage.label}:${stage.state}`),
    [
      "Created:done",
      "Queued:done",
      "Sent:done",
      "Acknowledged:done",
      "Partial:active",
      "Filled:pending",
    ],
  );
});

test("toTradeHistoryRows uses the latest partial-fill update as its activity timestamp", () => {
  const row = toTradeHistoryRows([
    createRecord({
      lifecycleStatus: "PARTIALLY_FILLED",
      filledAt: undefined,
      acknowledgedAt: "2026-08-04T12:00:02.000Z",
      updatedAt: "2026-08-04T12:00:08.000Z",
      partialFillCount: 1,
      filledQuantity: 1,
      remainingQuantity: 1,
    }),
  ])[0];

  assert.equal(row.timestamp, "2026-08-04T12:00:08.000Z");
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

test("describeTradeLifecycleOverview highlights exceptions before in-flight work", () => {
  const overview = describeTradeLifecycleOverview([
    createRecord({ lifecycleStatus: "FAILED", failedAt: "2026-08-04T12:00:05.000Z" }),
    createRecord({ historyId: "2", lifecycleStatus: "ACKNOWLEDGED", acknowledgedAt: "2026-08-04T12:00:03.000Z" }),
  ]);

  assert.equal(overview.headline, "1 execution needs attention");
  assert.equal(overview.detail, "1 acknowledged order is still waiting on fills.");
  assert.equal(overview.tone, "danger");
});

test("describeTradeLifecycleOverview calls out sent orders waiting on acknowledgement", () => {
  const overview = describeTradeLifecycleOverview([
    createRecord({ lifecycleStatus: "FAILED", failedAt: "2026-08-04T12:00:05.000Z" }),
    createRecord({
      historyId: "2",
      lifecycleStatus: "SENT",
      filledAt: undefined,
      sentAt: "2026-08-04T12:00:03.000Z",
      updatedAt: "2026-08-04T12:00:03.000Z",
    }),
  ]);

  assert.equal(overview.headline, "1 execution needs attention");
  assert.equal(overview.detail, "1 order is still waiting on broker acknowledgement.");
  assert.equal(overview.tone, "danger");
});

test("describeTradeLifecycleOverview calls out partial fills as active work", () => {
  const overview = describeTradeLifecycleOverview([
    createRecord({
      lifecycleStatus: "PARTIALLY_FILLED",
      filledAt: undefined,
      remainingQuantity: 1,
      filledQuantity: 1,
      updatedAt: "2026-08-04T12:00:05.000Z",
    }),
  ]);

  assert.equal(overview.headline, "1 execution partially filled");
  assert.equal(overview.detail, "1 order still needs remaining fills before they are complete.");
  assert.equal(overview.tone, "warn");
});

test("buildTradeLifecycleStageCards groups records into simple lifecycle buckets", () => {
  const cards = buildTradeLifecycleStageCards([
    createRecord({ lifecycleStatus: "INTENT_CREATED", filledAt: undefined }),
    createRecord({ historyId: "2", lifecycleStatus: "QUEUED", filledAt: undefined }),
    createRecord({ historyId: "3", lifecycleStatus: "SENT", filledAt: undefined }),
    createRecord({ historyId: "4", lifecycleStatus: "ACKNOWLEDGED", filledAt: undefined }),
    createRecord({ historyId: "5", lifecycleStatus: "PARTIALLY_FILLED", filledAt: undefined }),
    createRecord({ historyId: "6", lifecycleStatus: "FILLED" }),
    createRecord({ historyId: "7", lifecycleStatus: "RULE_REJECTED", filledAt: undefined }),
  ]);

  assert.deepEqual(cards, [
    { label: "Intent", value: "1", tone: "warn" },
    { label: "Queued", value: "1", tone: "warn" },
    { label: "Broker", value: "2", tone: "warn" },
    { label: "Partial", value: "1", tone: "warn" },
    { label: "Filled", value: "1", tone: "ok" },
    { label: "Exceptions", value: "1", tone: "danger" },
  ]);
});

test("buildTradeJourneyRows produces simple next-step guidance for recent records", () => {
  const rows = buildTradeJourneyRows([
    createRecord({
      historyId: "filled",
      lifecycleStatus: "FILLED",
      filledAt: "2026-08-04T12:00:04.000Z",
      updatedAt: "2026-08-04T12:00:04.000Z",
    }),
    createRecord({
      historyId: "ack",
      lifecycleStatus: "ACKNOWLEDGED",
      filledAt: undefined,
      acknowledgedAt: "2026-08-04T12:00:05.000Z",
      updatedAt: "2026-08-04T12:00:05.000Z",
    }),
    createRecord({
      historyId: "partial",
      lifecycleStatus: "PARTIALLY_FILLED",
      filledAt: undefined,
      remainingQuantity: 1,
      updatedAt: "2026-08-04T12:00:05.500Z",
    }),
    createRecord({
      historyId: "rule",
      lifecycleStatus: "RULE_REJECTED",
      filledAt: undefined,
      lastErrorMessage: "Risk limit breached",
      updatedAt: "2026-08-04T12:00:06.000Z",
    }),
  ], 4);

  assert.deepEqual(
    rows.map((row) => ({
      id: row.id,
      stageLabel: row.stageLabel,
      nextStepLabel: row.nextStepLabel,
      tone: row.tone,
    })),
    [
      {
        id: "rule",
        stageLabel: "Rejected by rule",
        nextStepLabel: "Risk limit breached",
        tone: "danger",
      },
      {
        id: "partial",
        stageLabel: "Partial fill",
        nextStepLabel: "Waiting on 1 more contract",
        tone: "warn",
      },
      {
        id: "ack",
        stageLabel: "Acknowledged",
        nextStepLabel: "Waiting for fill",
        tone: "warn",
      },
      {
        id: "filled",
        stageLabel: "Filled",
        nextStepLabel: "Complete",
        tone: "ok",
      },
    ],
  );
});

test("buildDashboardExecutionPathRows pins failed and in-flight records ahead of cleared ones", () => {
  const rows = buildDashboardExecutionPathRows([
    createRecord({
      historyId: "filled",
      lifecycleStatus: "FILLED",
      filledAt: "2026-08-04T12:00:04.000Z",
      updatedAt: "2026-08-04T12:00:04.000Z",
    }),
    createRecord({
      historyId: "partial",
      lifecycleStatus: "PARTIALLY_FILLED",
      filledAt: undefined,
      filledQuantity: 1,
      remainingQuantity: 1,
      updatedAt: "2026-08-04T12:00:05.000Z",
    }),
    createRecord({
      historyId: "failed",
      lifecycleStatus: "FAILED",
      failedAt: "2026-08-04T12:00:06.000Z",
      updatedAt: "2026-08-04T12:00:06.000Z",
      lastErrorMessage: "Broker unavailable",
    }),
  ], 3);

  assert.deepEqual(
    rows.map((row) => ({
      id: row.id,
      attentionState: row.attentionState,
      attentionLabel: row.attentionLabel,
      executionHeadline: row.executionSummary.headline,
      executionDetail: row.executionSummary.detail,
    })),
    [
      {
        id: "failed",
        attentionState: "alert",
        attentionLabel: "Needs attention",
        executionHeadline: "Failed",
        executionDetail: "Broker unavailable",
      },
      {
        id: "partial",
        attentionState: "watch",
        attentionLabel: "Partial fill",
        executionHeadline: "Partial fill",
        executionDetail: "1/2 filled, 1 remaining",
      },
      {
        id: "filled",
        attentionState: "ok",
        attentionLabel: "Cleared",
        executionHeadline: "Filled",
        executionDetail: "2/2 contracts complete",
      },
    ],
  );
});

test("buildDashboardExecutionAttentionCards summarizes failed, partial, and broker-routed work", () => {
  const cards = buildDashboardExecutionAttentionCards([
    createRecord({
      historyId: "failed",
      lifecycleStatus: "FAILED",
      failedAt: "2026-08-04T12:00:06.000Z",
      updatedAt: "2026-08-04T12:00:06.000Z",
    }),
    createRecord({
      historyId: "partial",
      lifecycleStatus: "PARTIALLY_FILLED",
      filledAt: undefined,
      updatedAt: "2026-08-04T12:00:05.000Z",
    }),
    createRecord({
      historyId: "ack",
      lifecycleStatus: "ACKNOWLEDGED",
      filledAt: undefined,
      updatedAt: "2026-08-04T12:00:04.000Z",
    }),
    createRecord({
      historyId: "sent",
      lifecycleStatus: "SENT",
      filledAt: undefined,
      sentAt: "2026-08-04T12:00:03.000Z",
      updatedAt: "2026-08-04T12:00:03.000Z",
    }),
  ]);

  assert.deepEqual(cards, [
    {
      label: "Failed",
      value: "1",
      tone: "alert",
      detail: "1 execution need review",
    },
    {
      label: "Partial",
      value: "1",
      tone: "watch",
      detail: "1 order still need remaining fills",
    },
    {
      label: "Broker",
      value: "2",
      tone: "watch",
      detail: "1 order is still waiting on broker acknowledgement and 1 acknowledged order is still waiting on fills",
    },
  ]);
});

test("buildTradeHistoryQueryString encodes status, query, and limit", () => {
  assert.equal(
    buildTradeHistoryQueryString({
      status: "pending",
      query: "ES follower",
      limit: 250,
    }),
    "?limit=250&status=QUEUED%2CSENT%2CACKNOWLEDGED%2CINTENT_CREATED%2CPARTIALLY_FILLED&q=ES+follower",
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
  const twoDaysAgo = isoDaysAgo(2, 14);
  const oneDayAgo = isoDaysAgo(1, 14);
  const oneDayAgoLater = isoDaysAgo(1, 15);
  const summary = summarizeTradeHistoryByDay([
    createRecord({
      historyId: "day-1",
      lifecycleStatus: "FILLED",
      filledAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    }),
    createRecord({
      historyId: "day-2",
      lifecycleStatus: "FAILED",
      filledAt: undefined,
      failedAt: oneDayAgo,
      updatedAt: oneDayAgo,
    }),
    createRecord({
      historyId: "day-3",
      lifecycleStatus: "QUEUED",
      filledAt: undefined,
      queuedAt: oneDayAgoLater,
      updatedAt: oneDayAgoLater,
    }),
  ], 3);

  const failedDay = new Date(oneDayAgo);
  const filledDay = new Date(twoDaysAgo);
  const currentDay = new Date();
  currentDay.setHours(0, 0, 0, 0);

  assert.deepEqual(
    summary.map((day) => ({
      dateKey: day.dateKey,
      total: day.total,
      filled: day.filled,
      pending: day.pending,
      failed: day.failed,
    })),
    [
      { dateKey: filledDay.toISOString().slice(0, 10), total: 1, filled: 1, pending: 0, failed: 0 },
      { dateKey: failedDay.toISOString().slice(0, 10), total: 2, filled: 0, pending: 1, failed: 1 },
      { dateKey: currentDay.toISOString().slice(0, 10), total: 0, filled: 0, pending: 0, failed: 0 },
    ],
  );
});
