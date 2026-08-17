import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAccountRemoval } from "./account-removal-guard";

test("account removal allows an unused disconnected account", () => {
  assert.deepEqual(
    evaluateAccountRemoval({
      accountId: "account-1",
      isConnected: false,
      copyGroups: [],
      tradeCopyStatus: null,
    }),
    { allowed: true },
  );
});

test("account removal blocks connected accounts", () => {
  const decision = evaluateAccountRemoval({
    accountId: "account-1",
    isConnected: true,
    copyGroups: [],
  });

  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.reason, "CONNECTED");
});

test("account removal blocks master and follower copy-group assignments", () => {
  const copyGroups = [
    {
      name: "Primary group",
      masterAccountId: "master-1",
      followerAccountIds: ["follower-1"],
    },
  ];

  for (const accountId of ["master-1", "follower-1"]) {
    const decision = evaluateAccountRemoval({
      accountId,
      isConnected: false,
      copyGroups,
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.reason, "COPY_GROUP_ASSIGNED");
      assert.match(decision.message, /Primary group/);
    }
  }
});

test("account removal blocks active session participants", () => {
  const tradeCopyStatus = {
    masterAccountId: "master-1",
    followers: [{ accountId: "follower-1" }],
  };

  for (const accountId of ["master-1", "follower-1"]) {
    const decision = evaluateAccountRemoval({
      accountId,
      isConnected: false,
      copyGroups: [],
      tradeCopyStatus,
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.reason, "ACTIVE_COPY_SESSION");
  }
});
