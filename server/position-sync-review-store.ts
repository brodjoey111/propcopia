import { eq } from "drizzle-orm";

import {
  positionSyncReviews,
  type InsertPositionSyncReview,
  type PositionSyncReview,
} from "@shared/schema";

import { db } from "./db";

interface PositionSyncOperatorAssignment {
  operatorName: string;
  assignedAt: string;
  reason?: string;
}

export interface PersistedPositionSyncReview {
  groupId: string;
  followerAccountId: string;
  status: "reviewed" | "simulated" | "approved" | "handed_off" | "completed_manually";
  note?: string;
  operatorName?: string;
  operatorHistory?: PositionSyncOperatorAssignment[];
  reviewedAt?: string;
  simulatedAt?: string;
  approvedAt?: string;
  handedOffAt?: string;
  completedManuallyAt?: string;
}

export interface PositionSyncReviewStoreRepository {
  upsertReview(entry: InsertPositionSyncReview): Promise<void>;
  listReviews(userId: string): Promise<PositionSyncReview[]>;
}

class DbPositionSyncReviewStoreRepository implements PositionSyncReviewStoreRepository {
  async upsertReview(entry: InsertPositionSyncReview): Promise<void> {
    await db
      .insert(positionSyncReviews)
      .values(entry)
      .onConflictDoUpdate({
        target: positionSyncReviews.reviewKey,
        set: {
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
          updatedAt: new Date(),
        },
      });
  }

  async listReviews(userId: string): Promise<PositionSyncReview[]> {
    return db.select().from(positionSyncReviews).where(eq(positionSyncReviews.userId, userId));
  }
}

export function buildPositionSyncReviewKey(groupId: string, followerAccountId: string): string {
  return `${groupId}:${followerAccountId}`;
}

function deserializeReview(row: PositionSyncReview): PersistedPositionSyncReview {
  const operatorHistory = row.operatorHistoryJson
    ? safeParseOperatorHistory(row.operatorHistoryJson)
    : undefined;

  return {
    groupId: row.groupId,
    followerAccountId: row.followerAccountId,
    status: row.status as "reviewed" | "simulated" | "approved" | "handed_off" | "completed_manually",
    note: row.note ?? undefined,
    operatorName: row.operatorName ?? undefined,
    operatorHistory,
    reviewedAt: row.reviewedAt?.toISOString(),
    simulatedAt: row.simulatedAt?.toISOString(),
    approvedAt: row.approvedAt?.toISOString(),
    handedOffAt: row.handedOffAt?.toISOString(),
    completedManuallyAt: row.completedManuallyAt?.toISOString(),
  };
}

function safeParseOperatorHistory(value: string): PositionSyncOperatorAssignment[] | undefined {
  try {
    const parsed = JSON.parse(value) as PositionSyncOperatorAssignment[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export class PositionSyncReviewStore {
  constructor(
    private readonly repository: PositionSyncReviewStoreRepository = new DbPositionSyncReviewStoreRepository(),
  ) {}

  async saveReviews(userId: string, reviews: PersistedPositionSyncReview[]): Promise<void> {
    for (const review of reviews) {
      await this.repository.upsertReview({
        reviewKey: buildPositionSyncReviewKey(review.groupId, review.followerAccountId),
        userId,
        groupId: review.groupId,
        followerAccountId: review.followerAccountId,
        status: review.status,
        note: review.note ?? null,
        operatorName: review.operatorName ?? null,
        operatorHistoryJson: review.operatorHistory
          ? JSON.stringify(review.operatorHistory)
          : null,
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        simulatedAt: review.simulatedAt ? new Date(review.simulatedAt) : null,
        approvedAt: review.approvedAt ? new Date(review.approvedAt) : null,
        handedOffAt: review.handedOffAt ? new Date(review.handedOffAt) : null,
        completedManuallyAt: review.completedManuallyAt
          ? new Date(review.completedManuallyAt)
          : null,
        updatedAt: new Date(),
      });
    }
  }

  async listReviews(userId: string): Promise<PersistedPositionSyncReview[]> {
    const rows = await this.repository.listReviews(userId);
    return rows.map((row) => deserializeReview(row));
  }
}

export const positionSyncReviewStore = new PositionSyncReviewStore();
