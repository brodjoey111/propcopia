import assert from "node:assert/strict";
import test from "node:test";

import type { CopyGroupAlertReview, InsertCopyGroupAlertReview } from "@shared/schema";

import {
  buildCopyGroupAlertReviewKey,
  CopyGroupAlertReviewStore,
  type CopyGroupAlertReviewStoreRepository,
} from "./copy-group-alert-review-store";

class InMemoryCopyGroupAlertReviewStoreRepository implements CopyGroupAlertReviewStoreRepository {
  private rows = new Map<string, CopyGroupAlertReview>();

  async upsertReview(entry: InsertCopyGroupAlertReview): Promise<void> {
    this.rows.set(entry.reviewKey, {
      reviewKey: entry.reviewKey,
      userId: entry.userId,
      storyKey: entry.storyKey,
      groupId: entry.groupId,
      status: entry.status,
      note: entry.note ?? null,
      operatorName: entry.operatorName ?? null,
      operatorHistoryJson: entry.operatorHistoryJson ?? null,
      reviewedAt: entry.reviewedAt ?? null,
      updatedAt: entry.updatedAt ?? new Date(),
    });
  }

  async listReviews(userId: string): Promise<CopyGroupAlertReview[]> {
    return Array.from(this.rows.values()).filter((row) => row.userId === userId);
  }
}

test("buildCopyGroupAlertReviewKey creates a stable persisted key", () => {
  assert.equal(buildCopyGroupAlertReviewKey("copy-group:group-1"), "copy-group:group-1");
});

test("CopyGroupAlertReviewStore saves and restores ownership and review state", async () => {
  const store = new CopyGroupAlertReviewStore(new InMemoryCopyGroupAlertReviewStoreRepository());

  await store.saveReviews("user-1", [
    {
      storyKey: "copy-group:group-1",
      groupId: "group-1",
      status: "pending",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:20:00.000Z",
          reason: "Claimed shared copy-group alert",
        },
      ],
    },
    {
      storyKey: "copy-group:group-2",
      groupId: "group-2",
      status: "reviewed",
      note: "Recovered follower readiness and documented the issue.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:05:00.000Z",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:15:00.000Z",
          reason: "Took over shared copy-group recovery",
        },
      ],
      reviewedAt: "2026-08-11T18:30:00.000Z",
    },
  ]);

  const reviews = await store.listReviews("user-1");

  assert.deepEqual(reviews, [
    {
      storyKey: "copy-group:group-1",
      groupId: "group-1",
      status: "pending",
      note: undefined,
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:20:00.000Z",
          reason: "Claimed shared copy-group alert",
        },
      ],
      reviewedAt: undefined,
    },
    {
      storyKey: "copy-group:group-2",
      groupId: "group-2",
      status: "reviewed",
      note: "Recovered follower readiness and documented the issue.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:05:00.000Z",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:15:00.000Z",
          reason: "Took over shared copy-group recovery",
        },
      ],
      reviewedAt: "2026-08-11T18:30:00.000Z",
    },
  ]);
});
