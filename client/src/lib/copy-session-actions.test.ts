import assert from "node:assert/strict";
import test from "node:test";

import { buildCopySessionActionState } from "./copy-session-actions";
import type { CopySessionSummary } from "./copy-session-summary";

const reviewSummary: CopySessionSummary = {
  tone: "review",
  badgeLabel: "Needs review",
  headline: "Ready to launch",
  guidance: "Master can start a session.",
  helperText: "Review the lineup, then start the copy session.",
  followerHealthRows: [],
  unavailableFollowerCount: 0,
  reconnectingFollowerCount: 0,
};

test("buildCopySessionActionState enables start when setup is complete", () => {
  assert.deepEqual(
    buildCopySessionActionState({
      hasActiveSession: false,
      canStartSession: true,
      sessionActionPending: false,
      isStarting: false,
      isStopping: false,
      isRecovering: false,
      summary: reviewSummary,
    }),
    {
      primary: {
        kind: "start",
        label: "Start Session",
        disabled: false,
      },
      secondary: null,
    },
  );
});

test("buildCopySessionActionState exposes recover action when followers need help", () => {
  assert.deepEqual(
    buildCopySessionActionState({
      hasActiveSession: true,
      canStartSession: false,
      sessionActionPending: false,
      isStarting: false,
      isStopping: false,
      isRecovering: false,
      summary: {
        ...reviewSummary,
        tone: "attention",
        badgeLabel: "Needs attention",
        unavailableFollowerCount: 2,
      },
    }),
    {
      primary: {
        kind: "stop",
        label: "Stop Session",
        disabled: false,
      },
      secondary: {
        kind: "recover",
        label: "Recover Followers",
        disabled: false,
      },
    },
  );
});

test("buildCopySessionActionState carries pending labels through active mutations", () => {
  const stopping = buildCopySessionActionState({
    hasActiveSession: true,
    canStartSession: false,
    sessionActionPending: true,
    isStarting: false,
    isStopping: true,
    isRecovering: false,
    summary: reviewSummary,
  });

  assert.equal(stopping.primary.label, "Stopping...");
  assert.equal(stopping.primary.disabled, true);
});
