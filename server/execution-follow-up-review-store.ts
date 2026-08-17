import { eq } from "drizzle-orm";

import {
  executionFollowUpReviews,
  type ExecutionFollowUpReview,
  type InsertExecutionFollowUpReview,
} from "@shared/schema";

import { db } from "./db";

interface ExecutionFollowUpOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface PersistedExecutionFollowUpReview {
  historyId: string;
  status: "pending" | "reviewed";
  note?: string;
  operatorName?: string;
  operatorHistory?: ExecutionFollowUpOperatorAssignment[];
  reviewedAt?: string;
}

export interface ExecutionFollowUpReviewStoreRepository {
  upsertReview(entry: InsertExecutionFollowUpReview): Promise<void>;
  listReviews(userId: string): Promise<ExecutionFollowUpReview[]>;
}

class DbExecutionFollowUpReviewStoreRepository implements ExecutionFollowUpReviewStoreRepository {
  async upsertReview(entry: InsertExecutionFollowUpReview): Promise<void> {
    await db
      .insert(executionFollowUpReviews)
      .values(entry)
      .onConflictDoUpdate({
        target: executionFollowUpReviews.reviewKey,
        set: {
          userId: entry.userId,
          historyId: entry.historyId,
          status: entry.status,
          note: entry.note ?? null,
          operatorName: entry.operatorName ?? null,
          operatorHistoryJson: entry.operatorHistoryJson ?? null,
          reviewedAt: entry.reviewedAt ?? null,
          updatedAt: new Date(),
        },
      });
  }

  async listReviews(userId: string): Promise<ExecutionFollowUpReview[]> {
    return db.select().from(executionFollowUpReviews).where(eq(executionFollowUpReviews.userId, userId));
  }
}

export function buildExecutionFollowUpReviewKey(historyId: string): string {
  return historyId;
}

function safeParseOperatorHistory(value: string): ExecutionFollowUpOperatorAssignment[] | undefined {
  try {
    const parsed = JSON.parse(value) as ExecutionFollowUpOperatorAssignment[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function deserializeReview(row: ExecutionFollowUpReview): PersistedExecutionFollowUpReview {
  return {
    historyId: row.historyId,
    status: row.status as "pending" | "reviewed",
    note: row.note ?? undefined,
    operatorName: row.operatorName ?? undefined,
    operatorHistory: row.operatorHistoryJson
      ? safeParseOperatorHistory(row.operatorHistoryJson)
      : undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
  };
}

export class ExecutionFollowUpReviewStore {
  constructor(
    private readonly repository: ExecutionFollowUpReviewStoreRepository = new DbExecutionFollowUpReviewStoreRepository(),
  ) {}

  async saveReviews(userId: string, reviews: PersistedExecutionFollowUpReview[]): Promise<void> {
    for (const review of reviews) {
      await this.repository.upsertReview({
        reviewKey: buildExecutionFollowUpReviewKey(review.historyId),
        userId,
        historyId: review.historyId,
        status: review.status,
        note: review.note ?? null,
        operatorName: review.operatorName ?? null,
        operatorHistoryJson: review.operatorHistory ? JSON.stringify(review.operatorHistory) : null,
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        updatedAt: new Date(),
      });
    }
  }

  async listReviews(userId: string): Promise<PersistedExecutionFollowUpReview[]> {
    const rows = await this.repository.listReviews(userId);
    return rows.map((row) => deserializeReview(row));
  }
}

export const executionFollowUpReviewStore = new ExecutionFollowUpReviewStore();
