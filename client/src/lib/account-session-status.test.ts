import assert from "node:assert/strict";
import test from "node:test";

import { getAccountSessionStatusView } from "./account-session-status";

test("getAccountSessionStatusView marks a selected master before session start", () => {
  assert.deepEqual(
    getAccountSessionStatusView({
      accountId: "master-1",
      isConnected: true,
      activeSessionMasterAccountId: "master-1",
      tradeCopyStatus: null,
    }),
    {
      label: "selected master",
      tone: "warn",
    },
  );
});

test("getAccountSessionStatusView simplifies active follower statuses", () => {
  assert.deepEqual(
    getAccountSessionStatusView({
      accountId: "follower-1",
      isConnected: true,
      activeSessionMasterAccountId: "master-1",
      tradeCopyStatus: {
        masterAccountId: "master-1",
        masterConnected: true,
        ready: false,
        followers: [
          { accountId: "follower-1", connected: false, health: "reconnecting" },
        ],
      },
    }),
    {
      label: "reconnecting",
      tone: "warn",
    },
  );

  assert.deepEqual(
    getAccountSessionStatusView({
      accountId: "follower-2",
      isConnected: true,
      activeSessionMasterAccountId: "master-1",
      tradeCopyStatus: {
        masterAccountId: "master-1",
        masterConnected: true,
        ready: false,
        followers: [
          { accountId: "follower-2", connected: false, health: "unavailable" },
        ],
      },
    }),
    {
      label: "needs recovery",
      tone: "warn",
    },
  );
});

test("getAccountSessionStatusView labels connected accounts outside the session clearly", () => {
  assert.deepEqual(
    getAccountSessionStatusView({
      accountId: "follower-3",
      isConnected: true,
      activeSessionMasterAccountId: "master-1",
      tradeCopyStatus: {
        masterAccountId: "master-1",
        masterConnected: true,
        ready: true,
        followers: [],
      },
    }),
    {
      label: "not in session",
      tone: "warn",
    },
  );
});
