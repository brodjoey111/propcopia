import assert from "node:assert/strict";
import test from "node:test";

import type { PositionSyncOverviewResult } from "./position-sync-overview-service";
import { buildPositionSyncSimulation } from "./position-sync-simulation-service";

function createOverview(
  followerOverrides: Partial<PositionSyncOverviewResult["groups"][number]["followers"][number]> = {},
): PositionSyncOverviewResult {
  return {
    generatedAt: "2026-08-17T14:00:00.000Z",
    summary: {
      totalGroups: 1,
      inSyncGroups: 0,
      outOfSyncGroups: 1,
      unavailableGroups: 0,
      outOfSyncFollowers: 1,
      unavailableFollowers: 0,
      disabledFollowers: 0,
    },
    groups: [
      {
        groupId: "group-1",
        groupName: "Primary Group",
        masterAccountId: "master-1",
        masterAccountName: "Master",
        status: "OUT_OF_SYNC",
        summary: "1 follower needs position adjustments.",
        followerCount: 1,
        outOfSyncFollowers: 1,
        unavailableFollowers: 0,
        disabledFollowers: 0,
        followers: [
          {
            followerAccountId: "follower-1",
            followerName: "Follower 1",
            status: "OUT_OF_SYNC",
            summary: "1 adjustment needed to align with the master.",
            adjustmentCount: 1,
            adjustments: [
              {
                symbol: "ESU6",
                currentQuantity: 1,
                targetQuantity: 2,
                deltaQuantity: 1,
                action: "BUY",
                reason: "INCREASE",
              },
            ],
            ...followerOverrides,
          },
        ],
      },
    ],
  };
}

test("buildPositionSyncSimulation creates auditable simulation-only evidence", () => {
  const result = buildPositionSyncSimulation({
    overview: createOverview(),
    groupId: "group-1",
    followerAccountId: "follower-1",
    now: () => "2026-08-17T14:01:00.000Z",
    createId: () => "simulation-1",
  });

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.simulation.simulationId, "simulation-1");
  assert.equal(result.simulation.executionMode, "SIMULATION_ONLY");
  assert.equal(result.simulation.noOrdersSubmitted, true);
  assert.equal(result.simulation.adjustmentCount, 1);
  assert.match(result.simulation.planFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.simulation.adjustments, createOverview().groups[0]?.followers[0]?.adjustments);
});

test("identical repair plans keep the same fingerprint across simulation runs", () => {
  const first = buildPositionSyncSimulation({
    overview: createOverview(),
    groupId: "group-1",
    followerAccountId: "follower-1",
    createId: () => "simulation-1",
  });
  const second = buildPositionSyncSimulation({
    overview: createOverview(),
    groupId: "group-1",
    followerAccountId: "follower-1",
    createId: () => "simulation-2",
  });

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  if (!first.success || !second.success) return;
  assert.notEqual(first.simulation.simulationId, second.simulation.simulationId);
  assert.equal(first.simulation.planFingerprint, second.simulation.planFingerprint);
});

test("simulation rejects missing groups and followers", () => {
  assert.deepEqual(
    buildPositionSyncSimulation({
      overview: createOverview(),
      groupId: "missing-group",
      followerAccountId: "follower-1",
    }),
    {
      success: false,
      reason: "GROUP_NOT_FOUND",
      message: "Copy group not found: missing-group",
    },
  );

  assert.deepEqual(
    buildPositionSyncSimulation({
      overview: createOverview(),
      groupId: "group-1",
      followerAccountId: "missing-follower",
    }),
    {
      success: false,
      reason: "FOLLOWER_NOT_FOUND",
      message: "Follower plan not found: missing-follower",
    },
  );
});

test("simulation rejects aligned, disabled, and unavailable followers", () => {
  const cases = [
    {
      follower: { status: "IN_SYNC" as const, adjustments: [], adjustmentCount: 0 },
      reason: "ALREADY_IN_SYNC",
    },
    {
      follower: { status: "DISABLED" as const, adjustments: [], adjustmentCount: 0 },
      reason: "FOLLOWER_DISABLED",
    },
    {
      follower: { status: "UNAVAILABLE" as const, adjustments: [], adjustmentCount: 0 },
      reason: "POSITIONS_UNAVAILABLE",
    },
  ];

  for (const entry of cases) {
    const result = buildPositionSyncSimulation({
      overview: createOverview(entry.follower),
      groupId: "group-1",
      followerAccountId: "follower-1",
    });
    assert.equal(result.success, false);
    if (result.success) continue;
    assert.equal(result.reason, entry.reason);
  }
});

test("simulation rejects internally inconsistent repair adjustments", () => {
  const result = buildPositionSyncSimulation({
    overview: createOverview({
      adjustments: [
        {
          symbol: "ESU6",
          currentQuantity: 1,
          targetQuantity: 2,
          deltaQuantity: -1,
          action: "SELL",
          reason: "INCREASE",
        },
      ],
    }),
    groupId: "group-1",
    followerAccountId: "follower-1",
  });

  assert.deepEqual(result, {
    success: false,
    reason: "INVALID_PLAN",
    message: "The position repair plan failed its safety validation.",
  });
});
