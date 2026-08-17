import { eq } from "drizzle-orm";

import {
  copyGroupAlertReviews,
  type CopyGroupAlertReview,
  type InsertCopyGroupAlertReview,
} from "@shared/schema";

import { db } from "./db";

interface CopyGroupAlertOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface PersistedCopyGroupAlertReview {
  storyKey: string;
  groupId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: CopyGroupAlertOperatorAssignment[];
  reviewedAt?: string;
}

export interface CopyGroupAlertReviewStoreRepository {
  upsertReview(entry: InsertCopyGroupAlertReview): Promise<void>;
  listReviews(userId: string): Promise<CopyGroupAlertReview[]>;
}

class DbCopyGroupAlertReviewStoreRepository implements CopyGroupAlertReviewStoreRepository {
  async upsertReview(entry: InsertCopyGroupAlertReview): Promise<void> {
    await db
      .insert(copyGroupAlertReviews)
      .values(entry)
      .onConflictDoUpdate({
        target: copyGroupAlertReviews.reviewKey,
        set: {
          userId: entry.userId,
          storyKey: entry.storyKey,
          groupId: entry.groupId,
          status: entry.status,
          note: entry.note ?? null,
          operatorName: entry.operatorName ?? null,
          operatorHistoryJson: entry.operatorHistoryJson ?? null,
          reviewedAt: entry.reviewedAt ?? null,
          updatedAt: new Date(),
        },
      });
  }

  async listReviews(userId: string): Promise<CopyGroupAlertReview[]> {
    return db.select().from(copyGroupAlertReviews).where(eq(copyGroupAlertReviews.userId, userId));
  }
}

export function buildCopyGroupAlertReviewKey(storyKey: string): string {
  return storyKey;
}

function safeParseOperatorHistory(value: string): CopyGroupAlertOperatorAssignment[] | undefined {
  try {
    const parsed = JSON.parse(value) as CopyGroupAlertOperatorAssignment[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function deserializeReview(row: CopyGroupAlertReview): PersistedCopyGroupAlertReview {
  return {
    storyKey: row.storyKey,
    groupId: row.groupId,
    status: row.status as "pending" | "reviewed",
    note: row.note ?? undefined,
    operatorName: row.operatorName ?? undefined,
    operatorHistory: row.operatorHistoryJson
      ? safeParseOperatorHistory(row.operatorHistoryJson)
      : undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
  };
}

export class CopyGroupAlertReviewStore {
  constructor(
    private readonly repository: CopyGroupAlertReviewStoreRepository = new DbCopyGroupAlertReviewStoreRepository(),
  ) {}

  async saveReviews(userId: string, reviews: PersistedCopyGroupAlertReview[]): Promise<void> {
    for (const review of reviews) {
      await this.repository.upsertReview({
        reviewKey: buildCopyGroupAlertReviewKey(review.storyKey),
        userId,
        storyKey: review.storyKey,
        groupId: review.groupId,
        status: review.status,
        note: review.note ?? null,
        operatorName: review.operatorName ?? null,
        operatorHistoryJson: review.operatorHistory ? JSON.stringify(review.operatorHistory) : null,
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        updatedAt: new Date(),
      });
    }
  }

  async listReviews(userId: string): Promise<PersistedCopyGroupAlertReview[]> {
    const rows = await this.repository.listReviews(userId);
    return rows.map((row) => deserializeReview(row));
  }
}

export const copyGroupAlertReviewStore = new CopyGroupAlertReviewStore();
