import { eq } from "drizzle-orm";

import {
  riskFollowUpReviews,
  type InsertRiskFollowUpReview,
  type RiskFollowUpReview,
} from "@shared/schema";

import { db } from "./db";

interface RiskFollowUpOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface PersistedRiskFollowUpReview {
  accountId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: RiskFollowUpOperatorAssignment[];
  reviewedAt?: string;
}

export interface RiskFollowUpReviewStoreRepository {
  upsertReview(entry: InsertRiskFollowUpReview): Promise<void>;
  listReviews(userId: string): Promise<RiskFollowUpReview[]>;
}

class DbRiskFollowUpReviewStoreRepository implements RiskFollowUpReviewStoreRepository {
  async upsertReview(entry: InsertRiskFollowUpReview): Promise<void> {
    await db
      .insert(riskFollowUpReviews)
      .values(entry)
      .onConflictDoUpdate({
        target: riskFollowUpReviews.reviewKey,
        set: {
          userId: entry.userId,
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

  async listReviews(userId: string): Promise<RiskFollowUpReview[]> {
    return db.select().from(riskFollowUpReviews).where(eq(riskFollowUpReviews.userId, userId));
  }
}

export function buildRiskFollowUpReviewKey(accountId: string): string {
  return accountId;
}

function safeParseOperatorHistory(value: string): RiskFollowUpOperatorAssignment[] | undefined {
  try {
    const parsed = JSON.parse(value) as RiskFollowUpOperatorAssignment[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function deserializeReview(row: RiskFollowUpReview): PersistedRiskFollowUpReview {
  return {
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

export class RiskFollowUpReviewStore {
  constructor(
    private readonly repository: RiskFollowUpReviewStoreRepository = new DbRiskFollowUpReviewStoreRepository(),
  ) {}

  async saveReviews(userId: string, reviews: PersistedRiskFollowUpReview[]): Promise<void> {
    for (const review of reviews) {
      await this.repository.upsertReview({
        reviewKey: buildRiskFollowUpReviewKey(review.accountId),
        userId,
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

  async listReviews(userId: string): Promise<PersistedRiskFollowUpReview[]> {
    const rows = await this.repository.listReviews(userId);
    return rows.map((row) => deserializeReview(row));
  }
}

export const riskFollowUpReviewStore = new RiskFollowUpReviewStore();
