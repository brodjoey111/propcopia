import assert from "node:assert/strict";
import test from "node:test";

import type {
  CopyGroupRegistration,
  InsertCopyGroupRegistration,
} from "@shared/schema";

import {
  CopyGroupRegistrationStore,
  type CopyGroupRegistrationStoreRepository,
} from "./copy-group-registration-store";
import type { CopyFollower, CopyGroup } from "./copy-group-types";

class InMemoryCopyGroupRegistrationStoreRepository implements CopyGroupRegistrationStoreRepository {
  readonly rows = new Map<string, CopyGroupRegistration>();

  async upsertRegistration(entry: InsertCopyGroupRegistration): Promise<void> {
    this.rows.set(entry.groupId, {
      groupId: entry.groupId,
      userId: entry.userId,
      groupJson: entry.groupJson,
      followersJson: entry.followersJson,
      boardJson: entry.boardJson ?? null,
      runtimeStateJson: entry.runtimeStateJson ?? null,
      updatedAt: entry.updatedAt ?? new Date(),
    });
  }

  async listRegistrations(userId: string): Promise<CopyGroupRegistration[]> {
    return Array.from(this.rows.values()).filter((row) => row.userId === userId);
  }

  async deleteRegistration(userId: string, groupId: string): Promise<void> {
    const existing = this.rows.get(groupId);
    if (existing?.userId === userId) {
      this.rows.delete(groupId);
    }
  }
}

function createGroup(groupId: string): CopyGroup {
  return {
    groupId,
    userId: "user-1",
    name: "Primary Group",
    masterAccountId: "master-1",
    followerAccountIds: ["follower-1", "follower-2"],
    groupSettings: { enabled: true },
    riskSettings: { onRiskBreach: "PAUSE" },
    executionSettings: {
      mode: "SIMULATED",
      maxRetries: 0,
      retryDelayMs: 1000,
      orderTimeoutMs: 5000,
      flattenOnEmergencyStop: false,
    },
    createdAt: "2026-08-11T12:00:00.000Z",
    updatedAt: "2026-08-11T12:00:00.000Z",
  };
}

function createFollowers(groupId: string): CopyFollower[] {
  return [
    {
      groupId,
      followerAccountId: "follower-1",
      enabled: true,
      createdAt: "2026-08-11T12:00:00.000Z",
      updatedAt: "2026-08-11T12:00:00.000Z",
    },
  ];
}

test("CopyGroupRegistrationStore saves, restores, and deletes persisted group registrations", async () => {
  const repository = new InMemoryCopyGroupRegistrationStoreRepository();
  const store = new CopyGroupRegistrationStore(repository);

  await store.saveRegistration({
    board: {
      color: "#22c55e",
      position: 2,
      riskSettings: {
        blockedTickers: ["NQ"],
        maxDailyLoss: 500,
        onBreachAction: "pause",
      },
    },
    group: createGroup("group-1"),
    followers: createFollowers("group-1"),
    runtimeState: {
      groupId: "group-1",
      status: "PAUSED",
      isKillSwitchActive: false,
      masterConnected: false,
      connectedFollowerCount: 0,
      totalFollowerCount: 1,
      pausedAt: "2026-08-11T12:05:00.000Z",
    },
  });

  const registrations = await store.listRegistrations("user-1");
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0]?.group.groupId, "group-1");
  assert.equal(registrations[0]?.board?.color, "#22c55e");
  assert.equal(registrations[0]?.board?.position, 2);
  assert.deepEqual(registrations[0]?.board?.riskSettings, {
    blockedTickers: ["NQ"],
    maxDailyLoss: 500,
    onBreachAction: "pause",
  });
  assert.equal(registrations[0]?.followers[0]?.followerAccountId, "follower-1");
  assert.equal(registrations[0]?.runtimeState?.status, "PAUSED");

  await store.deleteRegistration("user-1", "group-1");
  const afterDelete = await store.listRegistrations("user-1");
  assert.deepEqual(afterDelete, []);
});
