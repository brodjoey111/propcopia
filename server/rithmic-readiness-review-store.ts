import { eq } from "drizzle-orm";

import {
  rithmicReadinessReviews,
  type InsertRithmicReadinessReview,
  type RithmicReadinessReview,
} from "@shared/schema";

import { db } from "./db";

interface RithmicReadinessOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface PersistedRithmicReadinessReview {
  storyKey: string;
  accountId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: RithmicReadinessOperatorAssignment[];
  reviewedAt?: string;
}

export interface RithmicReadinessReviewStoreRepository {
  upsertReview(entry: InsertRithmicReadinessReview): Promise<void>;
  listReviews(userId: string): Promise<RithmicReadinessReview[]>;
}

class DbRithmicReadinessReviewStoreRepository
  implements RithmicReadinessReviewStoreRepository
{
  async upsertReview(entry: InsertRithmicReadinessReview): Promise<void> {
    await db
      .insert(rithmicReadinessReviews)
      .values(entry)
      .onConflictDoUpdate({
        target: rithmicReadinessReviews.reviewKey,
        set: {
          userId: entry.userId,
          storyKey: entry.storyKey,
          accountId: entry.accountId,
          status: entry.status,
          note: entry.note ?? null,
          operatorName: entry.operatorName ?? null,
          operatorHistoryJson: entry.operatorHistoryJson ?? null,
          reviewedAt: entry.reviewedAt ?? null,
          updatedAt: new Date(),
        },
      });
  }

  async listReviews(userId: string): Promise<RithmicReadinessReview[]> {
    return db
      .select()
      .from(rithmicReadinessReviews)
      .where(eq(rithmicReadinessReviews.userId, userId));
  }
}

export function buildRithmicReadinessReviewKey(storyKey: string): string {
  return storyKey;
}

function safeParseOperatorHistory(value: string): RithmicReadinessOperatorAssignment[] | undefined {
  try {
    const parsed = JSON.parse(value) as RithmicReadinessOperatorAssignment[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function deserializeReview(row: RithmicReadinessReview): PersistedRithmicReadinessReview {
  return {
    storyKey: row.storyKey,
    accountId: row.accountId,
    status: row.status as "pending" | "reviewed",
    note: row.note ?? undefined,
    operatorName: row.operatorName ?? undefined,
    operatorHistory: row.operatorHistoryJson
      ? safeParseOperatorHistory(row.operatorHistoryJson)
      : undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
  };
}

export class RithmicReadinessReviewStore {
  constructor(
    private readonly repository: RithmicReadinessReviewStoreRepository = new DbRithmicReadinessReviewStoreRepository(),
  ) {}

  async saveReviews(userId: string, reviews: PersistedRithmicReadinessReview[]): Promise<void> {
    for (const review of reviews) {
      await this.repository.upsertReview({
        reviewKey: buildRithmicReadinessReviewKey(review.storyKey),
        userId,
        storyKey: review.storyKey,
        accountId: review.accountId,
        status: review.status,
        note: review.note ?? null,
        operatorName: review.operatorName ?? null,
        operatorHistoryJson: review.operatorHistory ? JSON.stringify(review.operatorHistory) : null,
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        updatedAt: new Date(),
      });
    }
  }

  async listReviews(userId: string): Promise<PersistedRithmicReadinessReview[]> {
    const rows = await this.repository.listReviews(userId);
    return rows.map((row) => deserializeReview(row));
  }
}

export const rithmicReadinessReviewStore = new RithmicReadinessReviewStore();
