import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExecutionRecoveryFollowUpQueue,
  type DashboardRuntimeOverviewResponse,
} from "./runtime-overview";

function buildExecutionRecovery(): DashboardRuntimeOverviewResponse["tradeAnalytics"]["executionRecovery"] {
  return {
    headline: "Execution recovery",
    detail: "Operator follow-up items",
    tone: "warn",
    staleThresholdMinutes: 5,
    primaryActionLabel: "Review failures",
    counts: {
      failed: 1,
      stale: 1,
      partial: 1,
      active: 1,
      brokerWait: 0,
      fillWait: 1,
      completed: 0,
    },
    actionCounts: [],
    items: [
      {
        historyId: "active-1",
        symbol: "NQ",
        followerAccountId: "follower-4",
        lifecycleStatus: "ACKNOWLEDGED",
        category: "active",
        recommendedAction: "wait_for_update",
        recommendedActionLabel: "Wait for next update",
        ageMinutes: 4,
        headline: "Waiting on lifecycle update",
        detail: "Order was acknowledged recently.",
        checkpoint: {
          label: "Broker acknowledged",
          detail: "Broker order BRK-1 is waiting on fill updates.",
          tone: "ok",
        },
        recoveryWindow: {
          label: "Fresh fill window",
          detail: "4 minutes since broker acknowledgement, still inside the 5 minute watch window.",
          tone: "ok",
        },
      },
      {
        historyId: "partial-1",
        symbol: "CL",
        followerAccountId: "follower-3",
        lifecycleStatus: "PARTIALLY_FILLED",
        category: "partial",
        recommendedAction: "monitor_fill",
        recommendedActionLabel: "Monitor fill progress",
        ageMinutes: 8,
        headline: "Partial fill still in progress",
        detail: "One remaining lot has not filled.",
        checkpoint: {
          label: "Partial fill active",
          detail: "1/2 filled with 1 contract still open after 2 partial fills.",
          tone: "warn",
        },
        recoveryWindow: {
          label: "Fill update overdue",
          detail: "8 minutes since partial fill update (stale window 5m).",
          tone: "danger",
        },
      },
      {
        historyId: "reviewed-failure",
        symbol: "YM",
        followerAccountId: "follower-2",
        lifecycleStatus: "FAILED",
        category: "failed",
        recommendedAction: "review_failure",
        recommendedActionLabel: "Review failure",
        ageMinutes: 11,
        headline: "Broker rejected the order",
        detail: "Follow-up already captured.",
        reviewStatus: "reviewed",
        reviewNote: "Checked logs and left a note.",
        reviewedAt: "2026-08-11T14:05:00.000Z",
        checkpoint: {
          label: "Execution failed",
          detail: "Broker rejected the order",
          tone: "danger",
        },
        recoveryWindow: {
          label: "Review captured",
          detail: "The failure note is already attached. Reopen only if the broker state changes.",
          tone: "ok",
        },
      },
      {
        historyId: "stale-1",
        symbol: "ES",
        followerAccountId: "follower-1",
        lifecycleStatus: "ACKNOWLEDGED",
        category: "stale",
        recommendedAction: "recheck_broker",
        recommendedActionLabel: "Recheck broker state",
        ageMinutes: 17,
        headline: "Acknowledged trade is now stale",
        detail: "No lifecycle updates have arrived in the stale window.",
        checkpoint: {
          label: "Broker acknowledged",
          detail: "Broker order BRK-2 is waiting on fill updates.",
          tone: "warn",
        },
        recoveryWindow: {
          label: "Fill update overdue",
          detail: "17 minutes since broker acknowledgement (stale window 5m).",
          tone: "danger",
        },
      },
    ],
  };
}

test("buildExecutionRecoveryFollowUpQueue prioritizes open failures and stale items before reviewed items", () => {
  const result = buildExecutionRecoveryFollowUpQueue(buildExecutionRecovery());

  assert.deepEqual(
    result.map((item) => item.historyId),
    ["stale-1", "partial-1", "active-1", "reviewed-failure"],
  );
  assert.equal(result[0]?.severity, "warn");
  assert.equal(result[0]?.actionLabel, "Recheck the latest broker state before the next copy decision.");
  assert.equal(result[0]?.checkpoint.label, "Broker acknowledged");
  assert.equal(result[0]?.recoveryWindow.label, "Fill update overdue");
  assert.equal(
    result[1]?.recoveryWindow.detail,
    "8 minutes since partial fill update (stale window 5m).",
  );
  assert.equal(result[2]?.checkpoint.tone, "ok");
  assert.equal(result[3]?.reviewStatus, "reviewed");
  assert.equal(
    result[3]?.actionLabel,
    "Review is already captured. Reopen only if the broker state changes.",
  );
  assert.equal(result[3]?.recoveryWindow.label, "Review captured");
});

test("buildExecutionRecoveryFollowUpQueue labels failed items as operator-reviewed work", () => {
  const result = buildExecutionRecoveryFollowUpQueue({
    ...buildExecutionRecovery(),
    items: [
      {
        historyId: "failed-open",
        symbol: "ES",
        followerAccountId: "follower-9",
        lifecycleStatus: "FAILED",
        category: "failed",
        recommendedAction: "review_failure",
        recommendedActionLabel: "Review failure",
        ageMinutes: 23,
        headline: "Follower order failed",
        detail: "Needs operator review.",
      },
    ],
  });

  assert.equal(result[0]?.severity, "error");
  assert.equal(
    result[0]?.actionLabel,
    "Capture the operator note, then mark the failure reviewed once follow-up is complete.",
  );
  assert.equal(result[0]?.checkpoint.label, "Execution failed");
  assert.equal(result[0]?.recoveryWindow.label, "Operator review open");
});

test("buildExecutionRecoveryFollowUpQueue preserves server-provided signal summaries when available", () => {
  const result = buildExecutionRecoveryFollowUpQueue({
    ...buildExecutionRecovery(),
    items: [
      {
        historyId: "active-custom",
        symbol: "RTY",
        followerAccountId: "follower-5",
        lifecycleStatus: "SENT",
        category: "active",
        recommendedAction: "wait_for_update",
        recommendedActionLabel: "Wait for next update",
        ageMinutes: 2,
        headline: "Still in flight",
        detail: "Waiting for broker acknowledgement.",
        checkpoint: {
          label: "Submitted to broker",
          detail: "Broker order BRK-77 is waiting for acknowledgement.",
          tone: "ok",
        },
        recoveryWindow: {
          label: "Fresh acknowledgement window",
          detail: "2 minutes since broker submission, still inside the 5 minute watch window.",
          tone: "ok",
        },
      },
    ],
  });

  assert.equal(result[0]?.checkpoint.label, "Submitted to broker");
  assert.equal(
    result[0]?.checkpoint.detail,
    "Broker order BRK-77 is waiting for acknowledgement.",
  );
  assert.equal(result[0]?.recoveryWindow.label, "Fresh acknowledgement window");
});
