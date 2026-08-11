import { and, eq } from "drizzle-orm";

import {
  copyGroupRegistrations,
  type CopyGroupRegistration,
  type InsertCopyGroupRegistration,
} from "@shared/schema";

import { db } from "./db";
import type { CopyFollower, CopyGroup, CopyGroupRuntimeState } from "./copy-group-types";

export interface PersistedCopyGroupRegistration {
  board?: {
    color?: string;
    position?: number;
    riskSettings?: Record<string, unknown>;
  };
  group: CopyGroup;
  followers: CopyFollower[];
  runtimeState?: Partial<CopyGroupRuntimeState> | null;
}

export interface CopyGroupRegistrationStoreRepository {
  upsertRegistration(entry: InsertCopyGroupRegistration): Promise<void>;
  listRegistrations(userId: string): Promise<CopyGroupRegistration[]>;
  deleteRegistration(userId: string, groupId: string): Promise<void>;
}

class DbCopyGroupRegistrationStoreRepository implements CopyGroupRegistrationStoreRepository {
  async upsertRegistration(entry: InsertCopyGroupRegistration): Promise<void> {
    await db
      .insert(copyGroupRegistrations)
      .values(entry)
      .onConflictDoUpdate({
        target: copyGroupRegistrations.groupId,
        set: {
          userId: entry.userId,
          groupJson: entry.groupJson,
          followersJson: entry.followersJson,
          boardJson: entry.boardJson ?? null,
          runtimeStateJson: entry.runtimeStateJson ?? null,
          updatedAt: new Date(),
        },
      });
  }

  async listRegistrations(userId: string): Promise<CopyGroupRegistration[]> {
    return db.select().from(copyGroupRegistrations).where(eq(copyGroupRegistrations.userId, userId));
  }

  async deleteRegistration(userId: string, groupId: string): Promise<void> {
    await db.delete(copyGroupRegistrations).where(
      and(
        eq(copyGroupRegistrations.userId, userId),
        eq(copyGroupRegistrations.groupId, groupId),
      ),
    );
  }
}

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeRegistration(input: PersistedCopyGroupRegistration): Pick<
  InsertCopyGroupRegistration,
  "groupJson" | "followersJson" | "boardJson" | "runtimeStateJson"
> {
  return {
    groupJson: JSON.stringify(input.group),
    followersJson: JSON.stringify(input.followers),
    boardJson: input.board ? JSON.stringify(input.board) : null,
    runtimeStateJson: input.runtimeState ? JSON.stringify(input.runtimeState) : null,
  };
}

function deserializeRegistration(
  record: CopyGroupRegistration,
): PersistedCopyGroupRegistration {
  return {
    board: record.boardJson
      ? safeParseJson<PersistedCopyGroupRegistration["board"] | undefined>(record.boardJson, undefined)
      : undefined,
    group: safeParseJson<CopyGroup>(record.groupJson, {} as CopyGroup),
    followers: safeParseJson<CopyFollower[]>(record.followersJson, []),
    runtimeState: record.runtimeStateJson
      ? safeParseJson<Partial<CopyGroupRuntimeState> | null>(record.runtimeStateJson, null)
      : null,
  };
}

export class CopyGroupRegistrationStore {
  constructor(
    private readonly repository: CopyGroupRegistrationStoreRepository = new DbCopyGroupRegistrationStoreRepository(),
  ) {}

  async saveRegistration(input: PersistedCopyGroupRegistration): Promise<void> {
    const serialized = serializeRegistration(input);
    await this.repository.upsertRegistration({
      groupId: input.group.groupId,
      userId: input.group.userId,
      ...serialized,
      updatedAt: new Date(),
    });
  }

  async listRegistrations(userId: string): Promise<PersistedCopyGroupRegistration[]> {
    const rows = await this.repository.listRegistrations(userId);
    return rows.map((row) => deserializeRegistration(row));
  }

  async getRegistration(
    userId: string,
    groupId: string,
  ): Promise<PersistedCopyGroupRegistration | undefined> {
    const registrations = await this.listRegistrations(userId);
    return registrations.find((registration) => registration.group.groupId === groupId);
  }

  async deleteRegistration(userId: string, groupId: string): Promise<void> {
    await this.repository.deleteRegistration(userId, groupId);
  }
}

export const copyGroupRegistrationStore = new CopyGroupRegistrationStore();
