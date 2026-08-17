import assert from "node:assert/strict";
import test from "node:test";

import {
  appendExecutionFollowUpOperatorAssignment,
  appendRiskFollowUpOperatorAssignment,
  buildExecutionFollowUpReviewPayload,
  buildRiskFollowUpItems,
  buildRithmicReadinessFollowUpItems,
  buildRiskFollowUpReviewPayload,
  filterExecutionFollowUpItems,
  filterRiskFollowUpItems,
  filterRithmicReadinessFollowUpItems,
  mergeExecutionFollowUpItems,
  summarizeExecutionFollowUpItems,
  summarizeRiskFollowUpItems,
  summarizeRithmicReadinessFollowUpItems,
} from "./follow-up-operator";

test("append follow-up operator assignment avoids duplicate consecutive owners", () => {
  const assignedAt = "2026-08-11T12:00:00.000Z";
  const initial = appendRiskFollowUpOperatorAssignment(undefined, "joseph", assignedAt, "Claimed");
  const duplicate = appendExecutionFollowUpOperatorAssignment(initial, "joseph", "2026-08-11T12:05:00.000Z", "Reclaimed");

  assert.deepEqual(duplicate, [
    {
      operatorName: "joseph",
      assignedAt,
      reason: "Claimed",
    },
  ]);
});

test("buildRiskFollowUpItems and filters merge notification metadata and review state", () => {
  const items = buildRiskFollowUpItems({
    accountItems: [
      {
        accountId: "acct-1",
        accountName: "Alpha",
        status: "BREACHED",
        headline: "Risk hold active",
        detail: "Daily loss breached.",
        tone: "danger",
        recommendedAction: "Keep paused.",
      },
      {
        accountId: "acct-2",
        accountName: "Beta",
        status: "WARN",
        headline: "Review before next start",
        detail: "Warning threshold near.",
        tone: "warn",
        recommendedAction: "Check sizing.",
      },
    ],
    notificationItems: [
      {
        id: "risk:acct-1:BREACHED",
        title: "Alpha risk breached",
        detail: "Alpha needs review",
        severity: "error",
        actionLabel: "Review Alpha",
        timestamp: "2026-08-11T12:15:00.000Z",
      },
    ],
    reviews: [
      {
        accountId: "acct-2",
        status: "reviewed",
        operatorName: "joseph",
        operatorHistory: [
          { operatorName: "amy", assignedAt: "2026-08-11T11:00:00.000Z" },
          { operatorName: "joseph", assignedAt: "2026-08-11T11:10:00.000Z" },
        ],
      },
    ],
  });

  assert.equal(items[0]?.notificationId, "risk:acct-1:BREACHED");
  assert.equal(items[1]?.review?.status, "reviewed");
  assert.equal(filterRiskFollowUpItems(items, "open", "").length, 1);
  assert.equal(filterRiskFollowUpItems(items, "reassigned", "").length, 1);
  assert.deepEqual(summarizeRiskFollowUpItems(items), {
    reviewedCount: 1,
    ownedCount: 1,
    unownedCount: 1,
    reassignedCount: 1,
  });
});

test("execution follow-up helpers merge review state and compute filters and counts", () => {
  const merged = mergeExecutionFollowUpItems(
    [
      {
        historyId: "exec-1",
        symbol: "ES",
        followerAccountId: "acct-1",
        lifecycleStatus: "FAILED",
        category: "failed",
        severity: "error",
        headline: "Needs review",
        detail: "Broker rejected order.",
        actionLabel: "Review failure",
        ageMinutes: 14,
        checkpoint: {
          label: "Execution failed",
          detail: "The broker returned a terminal failure state.",
          tone: "danger",
        },
        recoveryWindow: {
          label: "Operator review open",
          detail: "Capture the follow-up note before retrying.",
          tone: "danger",
        },
      },
      {
        historyId: "exec-2",
        symbol: "NQ",
        followerAccountId: "acct-2",
        lifecycleStatus: "ACKNOWLEDGED",
        category: "active",
        severity: "info",
        headline: "Still in flight",
        detail: "Waiting for update.",
        actionLabel: "Wait for next update",
        ageMinutes: 3,
        checkpoint: {
          label: "Broker acknowledged",
          detail: "The broker accepted the order.",
          tone: "ok",
        },
        recoveryWindow: {
          label: "Fresh lifecycle window",
          detail: "Still inside the watch window.",
          tone: "ok",
        },
      },
    ],
    [
      {
        historyId: "exec-1",
        status: "reviewed",
        note: "Checked broker logs.",
        operatorName: "joseph",
      },
    ],
  );

  assert.equal(merged[0]?.reviewStatus, "reviewed");
  assert.equal(
    filterExecutionFollowUpItems(merged, "reviewed", "", {}).map((item) => item.historyId).join(","),
    "exec-1",
  );
  assert.equal(
    filterExecutionFollowUpItems(merged, "active", "waiting", {}).map((item) => item.historyId).join(","),
    "exec-2",
  );
  assert.equal(
    filterExecutionFollowUpItems(merged, "failed", "operator review open", {}).map((item) => item.historyId).join(","),
    "exec-1",
  );
  assert.deepEqual(summarizeExecutionFollowUpItems(merged), {
    reviewedCount: 1,
    failedCount: 1,
    staleCount: 0,
    partialCount: 0,
    activeCount: 1,
  });
});

test("rithmic readiness helpers merge shared review state and compute filters and counts", () => {
  const items = buildRithmicReadinessFollowUpItems(
    [
      {
        id: "rithmic-readiness:acct-1:reconnect",
        timestamp: "2026-08-12T12:15:00.000Z",
        severity: "warn",
        category: "position",
        title: "Alpha Rithmic readiness needs reconnect proof",
        message: "Reconnect the saved account to capture fresh login evidence.",
        accountId: "acct-1",
        storyKey: "rithmic-readiness:acct-1",
      },
      {
        id: "rithmic-readiness:acct-2:review",
        timestamp: "2026-08-12T12:20:00.000Z",
        severity: "error",
        category: "position",
        title: "Beta Rithmic readiness needs review",
        message: "Saved account evidence is still incomplete.",
        accountId: "acct-2",
        storyKey: "rithmic-readiness:acct-2",
      },
    ],
    [
      {
        storyKey: "rithmic-readiness:acct-2",
        accountId: "acct-2",
        status: "reviewed",
        note: "Reconnect already validated for the next restart.",
        operatorName: "joseph",
        operatorHistory: [
          { operatorName: "amy", assignedAt: "2026-08-12T11:00:00.000Z" },
          { operatorName: "joseph", assignedAt: "2026-08-12T11:10:00.000Z" },
        ],
      },
    ],
  );

  assert.equal(items[0]?.accountName, "Alpha");
  assert.equal(items[1]?.review?.status, "reviewed");
  assert.equal(filterRithmicReadinessFollowUpItems(items, "open", "").length, 1);
  assert.equal(filterRithmicReadinessFollowUpItems(items, "reassigned", "").length, 1);
  assert.deepEqual(summarizeRithmicReadinessFollowUpItems(items), {
    reviewedCount: 1,
    ownedCount: 1,
    unownedCount: 1,
    reassignedCount: 1,
  });
});

test("review payload builders keep ownership history shaping consistent across pages", () => {
  const riskPayload = buildRiskFollowUpReviewPayload({
    accountId: "acct-1",
    currentReview: {
      accountId: "acct-1",
      status: "pending",
      operatorHistory: [{ operatorName: "amy", assignedAt: "2026-08-11T11:00:00.000Z" }],
    },
    operatorName: "joseph",
    note: "Reviewed with updated loss threshold.",
    status: "reviewed",
    assignmentReason: "Reviewed risk follow-up item",
    reviewedAt: "2026-08-11T12:00:00.000Z",
  });

  const executionPayload = buildExecutionFollowUpReviewPayload({
    historyId: "exec-1",
    currentReview: {
      historyId: "exec-1",
      status: "pending",
      operatorName: "joseph",
      operatorHistory: [{ operatorName: "joseph", assignedAt: "2026-08-11T11:50:00.000Z" }],
    },
    note: "Reopened after broker state changed.",
    status: "pending",
    assignmentReason: "Reopened execution follow-up item",
    reviewedAt: "2026-08-11T12:05:00.000Z",
  });

  assert.equal(riskPayload.reviewedAt, "2026-08-11T12:00:00.000Z");
  assert.equal(riskPayload.operatorHistory?.length, 2);
  assert.equal(executionPayload.reviewedAt, undefined);
  assert.equal(executionPayload.operatorHistory?.length, 1);
  assert.equal(executionPayload.note, "Reopened after broker state changed.");
});
