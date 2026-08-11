import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCopySession } from "./copy-session-summary";

test("summarizeCopySession guides setup when no master is selected", () => {
  assert.deepEqual(
    summarizeCopySession({
      tradeCopyStatus: null,
      selectedMasterAccountName: null,
      connectedFollowerCount: 0,
    }),
    {
      tone: "standby",
      badgeLabel: "Not started",
      headline: "Pick a session master",
      guidance: "Connect the account you want to lead, then set it as the session master.",
      helperText: null,
      followerHealthRows: [],
      unavailableFollowerCount: 0,
      reconnectingFollowerCount: 0,
    },
  );
});

test("summarizeCopySession marks a fully ready session cleanly", () => {
  const summary = summarizeCopySession({
    tradeCopyStatus: {
      masterAccountId: "master-1",
      masterConnected: true,
      followerCount: 2,
      connectedFollowerCount: 2,
      ready: true,
      followers: [
        { accountId: "f1", connected: true, health: "ready" },
        { accountId: "f2", connected: true, health: "ready" },
      ],
    },
    selectedMasterAccountName: "Apex Master",
    connectedFollowerCount: 2,
  });

  assert.equal(summary.tone, "ready");
  assert.equal(summary.badgeLabel, "Ready");
  assert.equal(summary.headline, "Copy session is fully ready");
  assert.equal(summary.guidance, "2/2 followers connected and receiving trades.");
});

test("summarizeCopySession surfaces unavailable followers as attention state", () => {
  const summary = summarizeCopySession({
    tradeCopyStatus: {
      masterAccountId: "master-1",
      masterConnected: true,
      followerCount: 3,
      connectedFollowerCount: 1,
      ready: false,
      followers: [
        { accountId: "f1", connected: true, health: "ready" },
        { accountId: "f2", connected: false, health: "unavailable" },
        { accountId: "f3", connected: false, health: "reconnecting" },
      ],
    },
    selectedMasterAccountName: "Apex Master",
    connectedFollowerCount: 2,
    followerNamesById: {
      f2: "Follower Two",
      f3: "Follower Three",
    },
  });

  assert.equal(summary.tone, "attention");
  assert.equal(summary.badgeLabel, "Needs attention");
  assert.equal(summary.unavailableFollowerCount, 1);
  assert.equal(summary.reconnectingFollowerCount, 1);
  assert.deepEqual(summary.followerHealthRows, [
    { accountId: "f2", name: "Follower Two", health: "unavailable" },
    { accountId: "f3", name: "Follower Three", health: "reconnecting" },
  ]);
});
