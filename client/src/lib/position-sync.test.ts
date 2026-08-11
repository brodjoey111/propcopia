import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPositionSyncReview,
  buildPositionSyncSummaryCards,
  describePositionSyncOverview,
  sortPositionSyncGroups,
} from "./position-sync";
import type { PositionSyncOverviewResponse } from "./runtime-overview";

const overview: PositionSyncOverviewResponse = {
  generatedAt: "2026-08-11T16:00:00.000Z",
  summary: {
    totalGroups: 3,
    inSyncGroups: 1,
    outOfSyncGroups: 1,
    unavailableGroups: 1,
    outOfSyncFollowers: 2,
    unavailableFollowers: 1,
  },
  groups: [
    {
      groupId: "g-sync",
      groupName: "Aligned",
      masterAccountId: "m1",
      masterAccountName: "Master 1",
      status: "IN_SYNC",
      summary: "Followers are aligned with the master.",
      followerCount: 2,
      outOfSyncFollowers: 0,
      unavailableFollowers: 0,
      followers: [],
    },
    {
      groupId: "g-out",
      groupName: "Needs Work",
      masterAccountId: "m2",
      masterAccountName: "Master 2",
      status: "OUT_OF_SYNC",
      summary: "2 followers need position adjustments.",
      followerCount: 2,
      outOfSyncFollowers: 2,
      unavailableFollowers: 0,
      followers: [],
    },
    {
      groupId: "g-wait",
      groupName: "Waiting",
      masterAccountId: "m3",
      masterAccountName: "Master 3",
      status: "UNAVAILABLE",
      summary: "1 follower is still waiting on live positions.",
      followerCount: 1,
      outOfSyncFollowers: 0,
      unavailableFollowers: 1,
      followers: [],
    },
  ],
};

test("describePositionSyncOverview highlights adjustment work first", () => {
  assert.deepEqual(describePositionSyncOverview(overview), {
    headline: "1 group need alignment",
    detail: "2 followers need position adjustments.",
    tone: "danger",
  });
});

test("buildPositionSyncSummaryCards maps overview counts into simple cards", () => {
  assert.deepEqual(buildPositionSyncSummaryCards(overview), [
    { label: "Groups", value: "3", tone: "ok" },
    { label: "Aligned", value: "1", tone: "ok" },
    { label: "Adjustments", value: "2", tone: "danger" },
    { label: "Waiting", value: "1", tone: "warn" },
  ]);
});

test("sortPositionSyncGroups prioritizes out-of-sync and unavailable groups", () => {
  assert.deepEqual(
    sortPositionSyncGroups(overview.groups).map((group) => group.groupId),
    ["g-out", "g-wait", "g-sync"],
  );
});

test("buildPositionSyncReview expands planned follower adjustments for manual review", () => {
  const review = buildPositionSyncReview([
    {
      groupId: "g-out",
      groupName: "Needs Work",
      masterAccountId: "m2",
      masterAccountName: "Master 2",
      status: "OUT_OF_SYNC",
      summary: "2 followers need position adjustments.",
      followerCount: 2,
      outOfSyncFollowers: 2,
      unavailableFollowers: 0,
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
        },
        {
          followerAccountId: "follower-2",
          followerName: "Follower 2",
          status: "UNAVAILABLE",
          summary: "Follower positions are not available yet.",
          adjustmentCount: 0,
          adjustments: [],
        },
      ],
    },
  ]);

  assert.deepEqual(review, [
    {
      groupId: "g-out",
      groupName: "Needs Work",
      status: "OUT_OF_SYNC",
      summary: "2 followers need position adjustments.",
      masterAccountName: "Master 2",
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
              actionLabel: "Add long",
              detail: "ESU6: +1 now, target +2 (+1 change).",
            },
          ],
        },
        {
          followerAccountId: "follower-2",
          followerName: "Follower 2",
          status: "UNAVAILABLE",
          summary: "Follower positions are not available yet.",
          adjustmentCount: 0,
          adjustments: [],
        },
      ],
    },
  ]);
});
