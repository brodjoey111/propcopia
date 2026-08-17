import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPositionSyncRepairProfile,
  buildPositionSyncReview,
  buildPositionSyncRepairRecommendations,
  buildPositionSyncSummaryCards,
  describePositionSyncOverview,
  sortPositionSyncGroups,
  summarizePositionSyncRepairOpportunities,
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
    disabledFollowers: 0,
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
      disabledFollowers: 0,
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
      disabledFollowers: 0,
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
      disabledFollowers: 0,
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
          repairRecommendation: {
            label: "Auto-ready next",
            tone: "ok",
            reason: "Low-complexity trim or sizing change.",
            complexity: "low",
            complexityLabel: "Low complexity",
            complexityScore: 1,
          },
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
          repairRecommendation: undefined,
          adjustments: [],
        },
      ],
    },
  ]);
});

test("buildPositionSyncRepairRecommendations separates low-complexity and manual review work", () => {
  const recommendations = buildPositionSyncRepairRecommendations([
    {
      groupId: "g-out",
      groupName: "Needs Work",
      masterAccountId: "m2",
      masterAccountName: "Master 2",
      status: "OUT_OF_SYNC",
      summary: "3 followers need position adjustments.",
      followerCount: 3,
      outOfSyncFollowers: 3,
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
              currentQuantity: 2,
              targetQuantity: 1,
              deltaQuantity: -1,
              action: "SELL",
              reason: "REDUCE",
            },
          ],
        },
        {
          followerAccountId: "follower-2",
          followerName: "Follower 2",
          status: "OUT_OF_SYNC",
          summary: "1 adjustment needed to align with the master.",
          adjustmentCount: 1,
          adjustments: [
            {
              symbol: "NQU6",
              currentQuantity: -1,
              targetQuantity: 1,
              deltaQuantity: 2,
              action: "BUY",
              reason: "REVERSE",
            },
          ],
        },
        {
          followerAccountId: "follower-3",
          followerName: "Follower 3",
          status: "OUT_OF_SYNC",
          summary: "1 adjustment needed to align with the master.",
          adjustmentCount: 1,
          adjustments: [
            {
              symbol: "RTYU6",
              currentQuantity: 0,
              targetQuantity: 1,
              deltaQuantity: 1,
              action: "BUY",
              reason: "OPEN",
            },
          ],
        },
      ],
    },
  ]);

  assert.deepEqual(recommendations, [
    {
      groupId: "g-out",
      groupName: "Needs Work",
      followerAccountId: "follower-1",
      followerName: "Follower 1",
      adjustmentCount: 1,
      recommendation: "auto_ready",
      reason: "Low-complexity trim or sizing change.",
      complexity: "low",
      complexityLabel: "Low complexity",
      complexityScore: 1,
    },
    {
      groupId: "g-out",
      groupName: "Needs Work",
      followerAccountId: "follower-2",
      followerName: "Follower 2",
      adjustmentCount: 1,
      recommendation: "manual_review",
      reason: "Contains a direction reversal.",
      complexity: "high",
      complexityLabel: "High complexity",
      complexityScore: 4,
    },
    {
      groupId: "g-out",
      groupName: "Needs Work",
      followerAccountId: "follower-3",
      followerName: "Follower 3",
      adjustmentCount: 1,
      recommendation: "manual_review",
      reason: "Includes a fresh open from flat.",
      complexity: "medium",
      complexityLabel: "Medium complexity",
      complexityScore: 3,
    },
  ]);
});

test("buildPositionSyncRepairProfile scores low, medium, and high complexity repair plans", () => {
  assert.deepEqual(
    buildPositionSyncRepairProfile({
      adjustmentCount: 1,
      adjustments: [
        {
          symbol: "ESU6",
          currentQuantity: 2,
          targetQuantity: 1,
          deltaQuantity: -1,
          action: "SELL",
          reason: "REDUCE",
        },
      ],
    }),
    {
      recommendation: "auto_ready",
      reason: "Low-complexity trim or sizing change.",
      complexity: "low",
      complexityLabel: "Low complexity",
      complexityScore: 1,
    },
  );

  assert.deepEqual(
    buildPositionSyncRepairProfile({
      adjustmentCount: 2,
      adjustments: [
        {
          symbol: "NQU6",
          currentQuantity: 0,
          targetQuantity: 1,
          deltaQuantity: 1,
          action: "BUY",
          reason: "OPEN",
        },
        {
          symbol: "ESU6",
          currentQuantity: 1,
          targetQuantity: 2,
          deltaQuantity: 1,
          action: "BUY",
          reason: "INCREASE",
        },
      ],
    }),
    {
      recommendation: "manual_review",
      reason: "Includes a fresh open from flat.",
      complexity: "medium",
      complexityLabel: "Medium complexity",
      complexityScore: 5,
    },
  );

  assert.deepEqual(
    buildPositionSyncRepairProfile({
      adjustmentCount: 1,
      adjustments: [
        {
          symbol: "RTYU6",
          currentQuantity: -1,
          targetQuantity: 2,
          deltaQuantity: 3,
          action: "BUY",
          reason: "REVERSE",
        },
      ],
    }),
    {
      recommendation: "manual_review",
      reason: "Contains a direction reversal.",
      complexity: "high",
      complexityLabel: "High complexity",
      complexityScore: 5,
    },
  );
});

test("summarizePositionSyncRepairOpportunities highlights manual review before auto-ready work", () => {
  assert.deepEqual(summarizePositionSyncRepairOpportunities(overview), {
    totalCandidates: 0,
    autoReadyCount: 0,
    manualReviewCount: 0,
    waitingCount: 1,
    headline: "1 follower still waiting on live positions",
    detail: "Repair recommendations will fill in after the next live snapshot.",
    tone: "warn",
  });

  const repairSummary = summarizePositionSyncRepairOpportunities({
    ...overview,
    summary: {
      ...overview.summary,
      unavailableFollowers: 0,
      outOfSyncFollowers: 2,
      disabledFollowers: 0,
    },
    groups: [
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
                currentQuantity: 2,
                targetQuantity: 1,
                deltaQuantity: -1,
                action: "SELL",
                reason: "REDUCE",
              },
            ],
          },
          {
            followerAccountId: "follower-2",
            followerName: "Follower 2",
            status: "OUT_OF_SYNC",
            summary: "1 adjustment needed to align with the master.",
            adjustmentCount: 1,
            adjustments: [
              {
                symbol: "NQU6",
                currentQuantity: -1,
                targetQuantity: 1,
                deltaQuantity: 2,
                action: "BUY",
                reason: "REVERSE",
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(repairSummary, {
    totalCandidates: 2,
    autoReadyCount: 1,
    manualReviewCount: 1,
    waitingCount: 0,
    headline: "1 sync item still need manual review",
    detail: "1 low-complexity repair candidate can be staged next without changing broker automation.",
    tone: "danger",
  });
});

test("describePositionSyncOverview and summaries surface intentionally disabled followers", () => {
  const disabledOverview: PositionSyncOverviewResponse = {
    generatedAt: "2026-08-11T16:30:00.000Z",
    summary: {
      totalGroups: 1,
      inSyncGroups: 1,
      outOfSyncGroups: 0,
      unavailableGroups: 0,
      outOfSyncFollowers: 0,
      unavailableFollowers: 0,
      disabledFollowers: 2,
    },
    groups: [
      {
        groupId: "g-disabled",
        groupName: "Disabled Desk",
        masterAccountId: "m9",
        masterAccountName: "Master 9",
        status: "IN_SYNC",
        summary: "All 2 followers are currently disabled for sync.",
        followerCount: 2,
        outOfSyncFollowers: 0,
        unavailableFollowers: 0,
        disabledFollowers: 2,
        followers: [
          {
            followerAccountId: "follower-a",
            followerName: "Follower A",
            status: "DISABLED",
            summary: "Follower sync is disabled.",
            adjustmentCount: 0,
            adjustments: [],
          },
          {
            followerAccountId: "follower-b",
            followerName: "Follower B",
            status: "DISABLED",
            summary: "Follower sync is disabled.",
            adjustmentCount: 0,
            adjustments: [],
          },
        ],
      },
    ],
  };

  assert.deepEqual(describePositionSyncOverview(disabledOverview), {
    headline: "2 followers currently excluded from sync",
    detail: "1 group is otherwise aligned with their masters.",
    tone: "muted",
  });

  assert.deepEqual(buildPositionSyncSummaryCards(disabledOverview), [
    { label: "Groups", value: "1", tone: "ok" },
    { label: "Aligned", value: "1", tone: "ok" },
    { label: "Adjustments", value: "0", tone: "ok" },
    { label: "Waiting", value: "2", tone: "muted" },
  ]);

  assert.deepEqual(summarizePositionSyncRepairOpportunities(disabledOverview), {
    totalCandidates: 0,
    autoReadyCount: 0,
    manualReviewCount: 0,
    waitingCount: 0,
    headline: "2 followers intentionally excluded",
    detail: "Disabled followers are not included in sync repair recommendations.",
    tone: "muted",
  });
});
