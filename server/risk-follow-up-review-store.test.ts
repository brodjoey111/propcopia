import assert from "node:assert/strict";
import test from "node:test";

import type { InsertRiskFollowUpReview, RiskFollowUpReview } from "@shared/schema";

import {
  buildRiskFollowUpReviewKey,
  RiskFollowUpReviewStore,
  type RiskFollowUpReviewStoreRepository,
} from "./risk-follow-up-review-store";

class InMemoryRiskFollowUpReviewStoreRepository implements RiskFollowUpReviewStoreRepository {
  private rows = new Map<string, RiskFollowUpReview>();

  async upsertReview(entry: InsertRiskFollowUpReview): Promise<void> {
    this.rows.set(entry.reviewKey, {
      reviewKey: entry.reviewKey,
      userId: entry.userId,
      accountId: entry.accountId,
      status: entry.status,
      note: entry.note ?? null,
      operatorName: entry.operatorName ?? null,
      operatorHistoryJson: entry.operatorHistoryJson ?? null,
      reviewedAt: entry.reviewedAt ?? null,
      updatedAt: entry.updatedAt ?? new Date(),
    });
  }

  async listReviews(userId: string): Promise<RiskFollowUpReview[]> {
    return Array.from(this.rows.values()).filter((row) => row.userId === userId);
  }
}

test("buildRiskFollowUpReviewKey creates a stable persisted key", () => {
  assert.equal(buildRiskFollowUpReviewKey("acct-2"), "acct-2");
});

test("RiskFollowUpReviewStore saves and restores reviewed and owned risk follow-up entries", async () => {
  const store = new RiskFollowUpReviewStore(new InMemoryRiskFollowUpReviewStoreRepository());

  await store.saveReviews("user-1", [
    {
      accountId: "acct-1",
      status: "pending",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:00:00.000Z",
          reason: "Picked up breached risk follow-up",
        },
      ],
    },
    {
      accountId: "acct-2",
      status: "reviewed",
      note: "Reviewed limits and left the account disabled for now.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:05:00.000Z",
        },
      ],
      reviewedAt: "2026-08-11T18:10:00.000Z",
    },
  ]);

  const reviews = await store.listReviews("user-1");

  assert.deepEqual(reviews, [
    {
      accountId: "acct-1",
      status: "pending",
      note: undefined,
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:00:00.000Z",
          reason: "Picked up breached risk follow-up",
        },
      ],
      reviewedAt: undefined,
    },
    {
      accountId: "acct-2",
      status: "reviewed",
      note: "Reviewed limits and left the account disabled for now.",
      operatorName: "joseph",
      operatorHistory: [
        {
          operatorName: "joseph",
          assignedAt: "2026-08-11T18:05:00.000Z",
        },
      ],
      reviewedAt: "2026-08-11T18:10:00.000Z",
    },
  ]);
});
