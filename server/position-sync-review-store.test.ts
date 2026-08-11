import assert from "node:assert/strict";
import test from "node:test";

import type { InsertPositionSyncReview, PositionSyncReview } from "@shared/schema";

import {
  buildPositionSyncReviewKey,
  PositionSyncReviewStore,
  type PositionSyncReviewStoreRepository,
} from "./position-sync-review-store";

class InMemoryPositionSyncReviewStoreRepository implements PositionSyncReviewStoreRepository {
  private rows = new Map<string, PositionSyncReview>();

  async upsertReview(entry: InsertPositionSyncReview): Promise<void> {
    this.rows.set(entry.reviewKey, {
      reviewKey: entry.reviewKey,
      userId: entry.userId,
      groupId: entry.groupId,
      followerAccountId: entry.followerAccountId,
      status: entry.status,
      note: entry.note ?? null,
      operatorName: entry.operatorName ?? null,
      operatorHistoryJson: entry.operatorHistoryJson ?? null,
      reviewedAt: entry.reviewedAt ?? null,
      simulatedAt: entry.simulatedAt ?? null,
      approvedAt: entry.approvedAt ?? null,
      handedOffAt: entry.handedOffAt ?? null,
      completedManuallyAt: entry.completedManuallyAt ?? null,
      updatedAt: entry.updatedAt ?? new Date(),
    });
  }

  async listReviews(userId: string): Promise<PositionSyncReview[]> {
    return Array.from(this.rows.values()).filter((row) => row.userId === userId);
  }
}

test("buildPositionSyncReviewKey creates a stable persisted key", () => {
  assert.equal(buildPositionSyncReviewKey("group-1", "follower-2"), "group-1:follower-2");
});

test("PositionSyncReviewStore saves and restores persisted review entries", async () => {
  const store = new PositionSyncReviewStore(new InMemoryPositionSyncReviewStoreRepository());

  await store.saveReviews("user-1", [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "reviewed",
      note: "Checked the plan and waiting on next session.",
      reviewedAt: "2026-08-11T16:00:00.000Z",
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "simulated",
      simulatedAt: "2026-08-11T16:05:00.000Z",
    },
    {
      groupId: "group-2",
      followerAccountId: "follower-4",
      status: "approved",
      note: "Ready for manual operator execution.",
      approvedAt: "2026-08-11T16:10:00.000Z",
    },
    {
      groupId: "group-3",
      followerAccountId: "follower-7",
      status: "completed_manually",
      note: "Operator finished the manual catch-up.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T16:13:00.000Z",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T16:14:00.000Z",
        },
      ],
      approvedAt: "2026-08-11T16:12:00.000Z",
      handedOffAt: "2026-08-11T16:14:00.000Z",
      completedManuallyAt: "2026-08-11T16:18:00.000Z",
    },
  ]);

  const reviews = await store.listReviews("user-1");

  assert.deepEqual(reviews, [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      status: "reviewed",
      note: "Checked the plan and waiting on next session.",
      operatorName: undefined,
      operatorHistory: undefined,
      reviewedAt: "2026-08-11T16:00:00.000Z",
      simulatedAt: undefined,
      approvedAt: undefined,
      handedOffAt: undefined,
      completedManuallyAt: undefined,
    },
    {
      groupId: "group-1",
      followerAccountId: "follower-2",
      status: "simulated",
      note: undefined,
      operatorName: undefined,
      operatorHistory: undefined,
      reviewedAt: undefined,
      simulatedAt: "2026-08-11T16:05:00.000Z",
      approvedAt: undefined,
      handedOffAt: undefined,
      completedManuallyAt: undefined,
    },
    {
      groupId: "group-2",
      followerAccountId: "follower-4",
      status: "approved",
      note: "Ready for manual operator execution.",
      operatorName: undefined,
      operatorHistory: undefined,
      reviewedAt: undefined,
      simulatedAt: undefined,
      approvedAt: "2026-08-11T16:10:00.000Z",
      handedOffAt: undefined,
      completedManuallyAt: undefined,
    },
    {
      groupId: "group-3",
      followerAccountId: "follower-7",
      status: "completed_manually",
      note: "Operator finished the manual catch-up.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T16:13:00.000Z",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T16:14:00.000Z",
        },
      ],
      reviewedAt: undefined,
      simulatedAt: undefined,
      approvedAt: "2026-08-11T16:12:00.000Z",
      handedOffAt: "2026-08-11T16:14:00.000Z",
      completedManuallyAt: "2026-08-11T16:18:00.000Z",
    },
  ]);
});
