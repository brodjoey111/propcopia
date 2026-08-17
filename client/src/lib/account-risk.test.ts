import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAccountRiskById,
  buildAccountRiskFollowUpQueue,
  describeGroupRiskSummary,
  summarizeGroupRisk,
  toAccountRiskBadgeView,
} from "./account-risk";

test("buildAccountRiskById indexes risk items by account id", () => {
  const metrics = buildAccountRiskById([
    {
      accountId: "acct-1",
      userId: "user-1",
      name: "Primary",
      platform: "Tradovate",
      accountType: "follower",
      status: "WARN",
      action: "pause",
      breachCount: 0,
      warningCount: 2,
      rules: [],
    },
  ]);

  assert.equal(metrics["acct-1"]?.status, "WARN");
  assert.equal(metrics["acct-1"]?.warningCount, 2);
});

test("toAccountRiskBadgeView maps breached and healthy accounts to stable badge copy", () => {
  assert.deepEqual(
    toAccountRiskBadgeView({
      accountId: "acct-danger",
      userId: "user-1",
      name: "Danger",
      platform: "Tradovate",
      accountType: "follower",
      status: "BREACHED",
      action: "close_and_pause",
      breachCount: 2,
      warningCount: 0,
      rules: [],
    }),
    {
      label: "2 breaches",
      tone: "danger",
    },
  );

  assert.deepEqual(
    toAccountRiskBadgeView({
      accountId: "acct-safe",
      userId: "user-1",
      name: "Safe",
      platform: "Tradovate",
      accountType: "follower",
      status: "OK",
      action: "pause",
      breachCount: 0,
      warningCount: 0,
      rules: [],
    }),
    {
      label: "Risk ok",
      tone: "ok",
    },
  );
});

test("summarizeGroupRisk blocks groups with breached active followers and ignores paused ones", () => {
  const summary = summarizeGroupRisk({
    accountIds: ["acct-safe", "acct-breach", "acct-paused"],
    disabledAccountIds: ["acct-paused"],
    accountRiskById: {
      "acct-safe": {
        accountId: "acct-safe",
        userId: "user-1",
        name: "Safe",
        platform: "Tradovate",
        accountType: "follower",
        status: "OK",
        action: "pause",
        breachCount: 0,
        warningCount: 0,
        rules: [],
      },
      "acct-breach": {
        accountId: "acct-breach",
        userId: "user-1",
        name: "Danger",
        platform: "Tradovate",
        accountType: "follower",
        status: "BREACHED",
        action: "close_and_pause",
        breachCount: 1,
        warningCount: 0,
        rules: [],
      },
      "acct-paused": {
        accountId: "acct-paused",
        userId: "user-1",
        name: "Paused Warning",
        platform: "Tradovate",
        accountType: "follower",
        status: "WARN",
        action: "pause",
        breachCount: 0,
        warningCount: 1,
        rules: [],
      },
    },
  });

  assert.equal(summary.blocked, true);
  assert.equal(summary.statusLabel, "Blocked from start");
  assert.deepEqual(summary.topBlockingAccountNames, ["Danger"]);
});

test("describeGroupRiskSummary produces plain-language launch guidance", () => {
  assert.deepEqual(
    describeGroupRiskSummary(
      {
        safeCount: 1,
        warningCount: 0,
        breachedCount: 1,
        pendingCount: 0,
        blocked: true,
        statusLabel: "Blocked from start",
        tone: "danger",
        topBlockingAccountNames: ["Danger"],
      },
      2,
    ),
    {
      headline: "Blocked from start",
      detail: "Danger is over configured limits.",
      tone: "danger",
    },
  );

  assert.deepEqual(
    describeGroupRiskSummary(
      {
        safeCount: 1,
        warningCount: 1,
        breachedCount: 0,
        pendingCount: 0,
        blocked: false,
        statusLabel: "1 warning",
        tone: "warn",
        topBlockingAccountNames: [],
      },
      2,
    ),
    {
      headline: "Review before start",
      detail: "1 of 2 followers near configured limits.",
      tone: "warn",
    },
  );
});

test("summarizeGroupRisk blocks launch when configured risk data is unavailable", () => {
  const summary = summarizeGroupRisk({
    accountIds: ["acct-pending"],
    accountRiskById: {
      "acct-pending": {
        accountId: "acct-pending",
        userId: "user-1",
        name: "Pending",
        platform: "Rithmic",
        accountType: "follower",
        status: "UNAVAILABLE",
        action: "pause",
        breachCount: 0,
        warningCount: 0,
        rules: [],
      },
    },
  });

  assert.equal(summary.blocked, true);
  assert.equal(summary.statusLabel, "Blocked: risk data pending");
  assert.deepEqual(describeGroupRiskSummary(summary, 1), {
    headline: "Blocked until risk data is ready",
    detail: "Pending is missing data required by configured limits.",
    tone: "muted",
  });
});

test("buildAccountRiskFollowUpQueue prioritizes breached accounts and produces operator guidance", () => {
  const result = buildAccountRiskFollowUpQueue([
    {
      accountId: "acct-pending",
      userId: "user-1",
      name: "Pending",
      platform: "Tradovate",
      accountType: "follower",
      status: "UNAVAILABLE",
      action: "pause",
      breachCount: 0,
      warningCount: 0,
      rules: [],
    },
    {
      accountId: "acct-warn",
      userId: "user-1",
      name: "Warning",
      platform: "Tradovate",
      accountType: "follower",
      status: "WARN",
      action: "pause",
      breachCount: 0,
      warningCount: 1,
      rules: [
        {
          code: "MAX_DAILY_LOSS",
          label: "Max daily loss",
          status: "WARN",
          value: 450,
          limit: 500,
          message: "Daily loss is approaching the configured limit.",
        },
      ],
    },
    {
      accountId: "acct-breach",
      userId: "user-1",
      name: "Breach",
      platform: "Tradovate",
      accountType: "follower",
      status: "BREACHED",
      action: "close_and_pause",
      breachCount: 2,
      warningCount: 0,
      rules: [
        {
          code: "MIN_ACCOUNT_BALANCE",
          label: "Min account balance",
          status: "BREACHED",
          value: 900,
          limit: 1000,
          message: "Account balance is below the configured floor.",
        },
      ],
    },
  ]);

  assert.deepEqual(
    result.map((item) => ({
      accountId: item.accountId,
      headline: item.headline,
      tone: item.tone,
    })),
    [
      {
        accountId: "acct-breach",
        headline: "Risk hold active",
        tone: "danger",
      },
      {
        accountId: "acct-warn",
        headline: "Review before next start",
        tone: "warn",
      },
      {
        accountId: "acct-pending",
        headline: "Risk data pending",
        tone: "muted",
      },
    ],
  );
  assert.equal(result[0]?.detail, "Account balance is below the configured floor.");
  assert.match(result[0]?.recommendedAction ?? "", /keep the account out of new copy sessions/i);
});
