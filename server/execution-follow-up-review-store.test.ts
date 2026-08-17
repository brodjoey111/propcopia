import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionFollowUpReview, InsertExecutionFollowUpReview } from "@shared/schema";

import {
  buildExecutionFollowUpReviewKey,
  ExecutionFollowUpReviewStore,
  type ExecutionFollowUpReviewStoreRepository,
} from "./execution-follow-up-review-store";

class InMemoryExecutionFollowUpReviewStoreRepository implements ExecutionFollowUpReviewStoreRepository {
  private rows = new Map<string, ExecutionFollowUpReview>();

  async upsertReview(entry: InsertExecutionFollowUpReview): Promise<void> {
    this.rows.set(entry.reviewKey, {
      reviewKey: entry.reviewKey,
      userId: entry.userId,
      historyId: entry.historyId,
      status: entry.status,
      note: entry.note ?? null,
      operatorName: entry.operatorName ?? null,
      operatorHistoryJson: entry.operatorHistoryJson ?? null,
      reviewedAt: entry.reviewedAt ?? null,
      updatedAt: entry.updatedAt ?? new Date(),
    });
  }

  async listReviews(userId: string): Promise<ExecutionFollowUpReview[]> {
    return Array.from(this.rows.values()).filter((row) => row.userId === userId);
  }
}

test("buildExecutionFollowUpReviewKey creates a stable persisted key", () => {
  assert.equal(buildExecutionFollowUpReviewKey("intent-123"), "intent-123");
});

test("ExecutionFollowUpReviewStore saves and restores owned and reviewed execution follow-up entries", async () => {
  const store = new ExecutionFollowUpReviewStore(new InMemoryExecutionFollowUpReviewStoreRepository());

  await store.saveReviews("user-1", [
    {
      historyId: "intent-1",
      status: "pending",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:20:00.000Z",
          reason: "Claimed stale execution follow-up",
        },
      ],
    },
    {
      historyId: "intent-2",
      status: "reviewed",
      note: "Checked order state and documented the recovery outcome.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:05:00.000Z",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:15:00.000Z",
          reason: "Took over failed execution review",
        },
      ],
      reviewedAt: "2026-08-11T18:30:00.000Z",
    },
  ]);

  const reviews = await store.listReviews("user-1");

  assert.deepEqual(reviews, [
    {
      historyId: "intent-1",
      status: "pending",
      note: undefined,
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:20:00.000Z",
          reason: "Claimed stale execution follow-up",
        },
      ],
      reviewedAt: undefined,
    },
    {
      historyId: "intent-2",
      status: "reviewed",
      note: "Checked order state and documented the recovery outcome.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "mark",
          assignedAt: "2026-08-11T18:05:00.000Z",
        },
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:15:00.000Z",
          reason: "Took over failed execution review",
        },
      ],
      reviewedAt: "2026-08-11T18:30:00.000Z",
    },
  ]);
});
