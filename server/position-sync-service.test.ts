import assert from "node:assert/strict";
import test from "node:test";

import type { AccountPositionSnapshot } from "./position-snapshot-service";
import {
  buildFollowerPositionSyncPlan,
  buildGroupPositionSyncPlans,
} from "./position-sync-service";

function createSnapshot(
  overrides: Partial<AccountPositionSnapshot>,
): AccountPositionSnapshot {
  return {
    accountId: overrides.accountId ?? "acct-1",
    userId: overrides.userId ?? "user-1",
    name: overrides.name ?? "Account 1",
    platform: overrides.platform ?? "Tradovate",
    accountType: overrides.accountType ?? "follower",
    brokerAccountId: overrides.brokerAccountId,
    status: overrides.status ?? "LIVE",
    reason: overrides.reason,
    positions: overrides.positions ?? [],
    openPositionCount: overrides.openPositionCount ?? (overrides.positions ?? []).length,
    capturedAt: overrides.capturedAt ?? "2026-08-11T12:00:00.000Z",
  };
}

test("buildFollowerPositionSyncPlan returns IN_SYNC when follower already matches master", () => {
  const master = createSnapshot({
    accountId: "master-1",
    accountType: "master",
    positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
  });
  const follower = createSnapshot({
    accountId: "follower-1",
    positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
  });

  const plan = buildFollowerPositionSyncPlan({ master, follower });

  assert.equal(plan.status, "IN_SYNC");
  assert.equal(plan.adjustments.length, 0);
});

test("buildFollowerPositionSyncPlan computes scaled deltas for multiplier followers", () => {
  const master = createSnapshot({
    accountId: "master-1",
    accountType: "master",
    positions: [{ symbol: "ESU6", quantity: 4, side: "LONG" }],
  });
  const follower = createSnapshot({
    accountId: "follower-1",
    positions: [{ symbol: "ESU6", quantity: 1, side: "LONG" }],
  });

  const plan = buildFollowerPositionSyncPlan({
    master,
    follower,
    config: {
      followerAccountId: "follower-1",
      positionScaling: 50,
    },
  });

  assert.equal(plan.status, "OUT_OF_SYNC");
  assert.deepEqual(plan.adjustments, [
    {
      symbol: "ESU6",
      currentQuantity: 1,
      targetQuantity: 2,
      deltaQuantity: 1,
      action: "BUY",
      reason: "INCREASE",
    },
  ]);
});

test("buildFollowerPositionSyncPlan reverses and caps target quantities when configured", () => {
  const master = createSnapshot({
    accountId: "master-1",
    accountType: "master",
    positions: [{ symbol: "NQU6", quantity: 5, side: "LONG" }],
  });
  const follower = createSnapshot({
    accountId: "follower-1",
    positions: [{ symbol: "NQU6", quantity: 0, side: "FLAT" }],
  });

  const plan = buildFollowerPositionSyncPlan({
    master,
    follower,
    config: {
      followerAccountId: "follower-1",
      reverseCopying: true,
      maxContracts: 3,
    },
  });

  assert.deepEqual(plan.adjustments, [
    {
      symbol: "NQU6",
      currentQuantity: 0,
      targetQuantity: -3,
      deltaQuantity: -3,
      action: "SELL",
      reason: "OPEN",
    },
  ]);
});

test("buildFollowerPositionSyncPlan flattens extra follower-only positions", () => {
  const master = createSnapshot({
    accountId: "master-1",
    accountType: "master",
    positions: [],
    openPositionCount: 0,
  });
  const follower = createSnapshot({
    accountId: "follower-1",
    positions: [{ symbol: "CLV6", quantity: -2, side: "SHORT" }],
  });

  const plan = buildFollowerPositionSyncPlan({ master, follower });

  assert.deepEqual(plan.adjustments, [
    {
      symbol: "CLV6",
      currentQuantity: -2,
      targetQuantity: 0,
      deltaQuantity: 2,
      action: "FLATTEN",
      reason: "FLATTEN_EXTRA",
    },
  ]);
});

test("buildFollowerPositionSyncPlan reports unavailable when snapshots are not live", () => {
  const master = createSnapshot({
    accountId: "master-1",
    accountType: "master",
    status: "UNAVAILABLE",
  });
  const follower = createSnapshot({
    accountId: "follower-1",
  });

  const plan = buildFollowerPositionSyncPlan({ master, follower });
  assert.equal(plan.status, "UNAVAILABLE");
  assert.equal(plan.adjustments.length, 0);
});

test("buildGroupPositionSyncPlans builds one plan per follower", () => {
  const master = createSnapshot({
    accountId: "master-1",
    accountType: "master",
    positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
  });
  const followers = [
    createSnapshot({
      accountId: "follower-1",
      name: "Follower 1",
      positions: [{ symbol: "ESU6", quantity: 2, side: "LONG" }],
    }),
    createSnapshot({
      accountId: "follower-2",
      name: "Follower 2",
      positions: [{ symbol: "ESU6", quantity: 1, side: "LONG" }],
    }),
  ];

  const plans = buildGroupPositionSyncPlans({ master, followers });

  assert.equal(plans.length, 2);
  assert.equal(plans[0]?.status, "IN_SYNC");
  assert.equal(plans[1]?.status, "OUT_OF_SYNC");
});
