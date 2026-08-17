import assert from "node:assert/strict";
import test from "node:test";

import { buildOperatorWorkSummary } from "./operator-work";

test("buildOperatorWorkSummary combines risk, execution, and sync lanes into one shared operator snapshot", () => {
  const summary = buildOperatorWorkSummary({
    riskItems: [
      {
        accountId: "acct-1",
        accountName: "Risk One",
        status: "BREACHED",
        headline: "Risk hold active",
        detail: "Daily loss breached.",
        tone: "danger",
        recommendedAction: "Keep paused.",
        review: {
          status: "pending",
        },
      },
      {
        accountId: "acct-2",
        accountName: "Risk Two",
        status: "WARN",
        headline: "Review before next start",
        detail: "Approaching drawdown.",
        tone: "warn",
        recommendedAction: "Review limits.",
        review: {
          status: "reviewed",
          operatorName: "joseph",
          operatorHistory: [
            { operatorName: "joseph", assignedAt: "2026-08-11T12:00:00.000Z" },
          ],
        },
      },
    ],
    executionItems: [
      {
        historyId: "exec-1",
        symbol: "ES",
        followerAccountId: "follower-1",
        lifecycleStatus: "FAILED",
        category: "failed",
        severity: "error",
        headline: "Needs review",
        detail: "Broker rejected order.",
        actionLabel: "Review failure",
        ageMinutes: 14,
        reviewStatus: "pending",
      },
      {
        historyId: "exec-2",
        symbol: "NQ",
        followerAccountId: "follower-2",
        lifecycleStatus: "ACKNOWLEDGED",
        category: "active",
        severity: "info",
        headline: "Still in flight",
        detail: "Waiting for update.",
        actionLabel: "Wait for next update",
        ageMinutes: 3,
        reviewStatus: "pending",
        operatorName: "joseph",
        operatorHistory: [
          { operatorName: "amy", assignedAt: "2026-08-11T11:45:00.000Z" },
          { operatorName: "joseph", assignedAt: "2026-08-11T11:50:00.000Z" },
        ],
      },
    ],
    rithmicReadinessItems: [
      {
        id: "rithmic-readiness:acct-3:reconnect",
        storyKey: "rithmic-readiness:acct-3",
        accountId: "acct-3",
        accountName: "Rithmic Follower",
        title: "Rithmic Follower needs reconnect proof",
        detail: "Reconnect the saved account to capture fresh login evidence.",
        severity: "warn",
        actionLabel: "Capture fresh reconnect proof before the next restart.",
        timestamp: "2026-08-12T11:55:00.000Z",
      },
    ],
    syncItems: [
      {
        key: "group-1:acct-9",
        groupId: "group-1",
        groupName: "Index Leaders",
        followerAccountId: "acct-9",
        followerName: "Follower Nine",
        status: "approved",
        summary: "Needs manual sizing adjustment.",
        adjustmentCount: 2,
        topAdjustments: ["ES", "NQ"],
        ageMinutes: 41,
        needsAttention: true,
        attentionLabel: "Approval waiting for handoff",
        reassignmentCount: 1,
        latestAssignmentReason: "Reassigned after missed handoff",
      },
    ],
  });

  assert.equal(summary.total, 6);
  assert.equal(summary.open, 5);
  assert.equal(summary.overdue, 4);
  assert.equal(summary.unassigned, 4);
  assert.equal(summary.reassigned, 2);
  assert.deepEqual(summary.laneCounts, {
    risk: 1,
    execution: 2,
    rithmicReadiness: 1,
    sync: 1,
  });
  assert.match(summary.headline, /need urgent follow-up/);
  assert.equal(
    summary.detail,
    "1 risk, 2 execution, 1 Rithmic readiness, and 1 manual sync items are still active.",
  );
});

test("buildOperatorWorkSummary reports a clear shared queue when every lane is resolved", () => {
  const summary = buildOperatorWorkSummary({
    riskItems: [
      {
        accountId: "acct-1",
        accountName: "Risk One",
        status: "OK",
        headline: "Healthy",
        detail: "No active risk issue.",
        tone: "ok",
        recommendedAction: "Keep routing.",
        review: {
          status: "reviewed",
          operatorName: "joseph",
          operatorHistory: [
            { operatorName: "joseph", assignedAt: "2026-08-11T12:00:00.000Z" },
          ],
        },
      },
    ],
    executionItems: [
      {
        historyId: "exec-1",
        symbol: "ES",
        followerAccountId: "follower-1",
        lifecycleStatus: "FILLED",
        category: "active",
        severity: "info",
        headline: "Completed",
        detail: "Order finished cleanly.",
        actionLabel: "No action needed",
        ageMinutes: 2,
        reviewStatus: "reviewed",
        operatorName: "joseph",
      },
    ],
    rithmicReadinessItems: [
      {
        id: "rithmic-readiness:acct-3:reconnect",
        storyKey: "rithmic-readiness:acct-3",
        accountId: "acct-3",
        accountName: "Rithmic Follower",
        title: "Rithmic Follower needs reconnect proof",
        detail: "Reconnect the saved account to capture fresh login evidence.",
        severity: "warn",
        actionLabel: "Capture fresh reconnect proof before the next restart.",
        timestamp: "2026-08-12T11:55:00.000Z",
        review: {
          status: "reviewed",
          operatorName: "joseph",
          operatorHistory: [
            { operatorName: "joseph", assignedAt: "2026-08-12T12:00:00.000Z" },
          ],
        },
      },
    ],
    syncItems: [
      {
        key: "group-1:acct-9",
        groupId: "group-1",
        groupName: "Index Leaders",
        followerAccountId: "acct-9",
        followerName: "Follower Nine",
        status: "completed_manually",
        summary: "Completed and confirmed.",
        adjustmentCount: 1,
        topAdjustments: ["ES"],
        ageMinutes: 12,
        needsAttention: false,
        attentionLabel: "Resolved",
        reassignmentCount: 0,
      },
    ],
  });

  assert.equal(summary.total, 4);
  assert.equal(summary.open, 0);
  assert.equal(summary.overdue, 0);
  assert.equal(summary.unassigned, 0);
  assert.equal(summary.reassigned, 0);
  assert.deepEqual(summary.laneCounts, {
    risk: 0,
    execution: 0,
    rithmicReadiness: 0,
    sync: 0,
  });
  assert.equal(summary.headline, "Shared operator queue is clear");
  assert.equal(
    summary.detail,
    "No shared risk, execution, Rithmic readiness, or manual sync follow-up is waiting on the operator.",
  );
});
