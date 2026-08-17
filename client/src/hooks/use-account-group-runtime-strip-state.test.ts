import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRecoveryActionPlan,
  shouldShowAccountGroupNextRecoveryStep,
  shouldShowAccountGroupRecoveryPriority,
  shouldShowAccountGroupRecoverySnapshot,
  shouldShowAccountGroupRecoveryTrail,
} from "@/hooks/use-account-group-runtime-strip-state";

test("account group runtime strip state hook centralizes recovery summary and signal mix derivation", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-group-runtime-strip-state.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupRuntimeStripState/);
  assert.match(source, /const recoverySummary = buildCopyGroupHistorySummary/);
  assert.match(source, /const nextRecoveryStep = describeNextRecoveryStep/);
  assert.match(source, /const recoveryChecklist = buildRecoveryChecklist/);
  assert.match(source, /export function buildRecoveryActionPlan/);
  assert.match(source, /const showRecoveryPriority =/);
  assert.match(source, /const showNextRecoveryStep =/);
  assert.match(source, /const showRecoverySnapshot =/);
  assert.match(source, /const showRecoveryTrail =/);
  assert.match(source, /const signalMixBadges = recoverySummary\.categoryBadges\.filter/);
  assert.match(source, /export function getSignalMixToneClass/);
  assert.match(source, /export function getRecoverySeverityToneClass/);
  assert.match(source, /export function shouldShowAccountGroupRecoveryPriority/);
  assert.match(source, /export function shouldShowAccountGroupNextRecoveryStep/);
  assert.match(source, /export function shouldShowAccountGroupRecoverySnapshot/);
  assert.match(source, /export function shouldShowAccountGroupRecoveryTrail/);
});

test("buildRecoveryActionPlan prioritizes lifecycle, recovery, and routing follow-up states", () => {
  assert.deepEqual(
    buildRecoveryActionPlan({
      resolvedRuntimeStatus: "READY",
      lifecycleActionPending: true,
      hasMasterWarning: false,
    }),
    {
      label: "Recovery update in progress",
      detail: "The latest group state change is still saving across the shared board.",
      toneClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    },
  );

  assert.deepEqual(
    buildRecoveryActionPlan({
      resolvedRuntimeStatus: "READY",
      lifecycleActionPending: false,
      hasMasterWarning: false,
      runtimeSummary: {
        tone: "warn",
        label: "Restored offline",
        detail: "Recovered after reload.",
      },
    }),
    {
      label: "Reload review required",
      detail: "Review recent group history, confirm follower readiness, then stage the group again when it is safe.",
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    },
  );

  assert.deepEqual(
    buildRecoveryActionPlan({
      resolvedRuntimeStatus: "PAUSED",
      lifecycleActionPending: false,
      hasMasterWarning: false,
      holdReason: "Risk hold is still active for one follower.",
    }),
    {
      label: "Hold condition active",
      detail: "Risk hold is still active for one follower.",
      toneClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    },
  );

  assert.deepEqual(
    buildRecoveryActionPlan({
      resolvedRuntimeStatus: "READY",
      lifecycleActionPending: false,
      hasMasterWarning: false,
      groupBoardState: {
        tone: "danger",
        label: "Routing blocked",
        detail: "Follower routing is still blocked by stale readiness signals.",
      },
    }),
    {
      label: "Routing attention required",
      detail: "Follower routing is still blocked by stale readiness signals.",
      toneClass: "border-red-500/20 bg-red-500/10 text-red-200",
    },
  );
});

test("runtime strip visibility helpers preserve recovery section show/hide rules", () => {
  assert.equal(
    shouldShowAccountGroupRecoveryPriority({
      recentErrorCount: 0,
      recentWarningCount: 0,
      recentLifecycleCount: 0,
      recentHealthCount: 0,
      holdReason: null,
    }),
    false,
  );
  assert.equal(
    shouldShowAccountGroupRecoveryPriority({
      recentErrorCount: 0,
      recentWarningCount: 1,
      recentLifecycleCount: 0,
      recentHealthCount: 0,
      holdReason: null,
    }),
    true,
  );

  assert.equal(
    shouldShowAccountGroupNextRecoveryStep({
      showRecoveryPriority: false,
      runtimeSummary: {
        tone: "warn",
        label: "Restored offline",
        detail: "Recovered after restart.",
      },
    }),
    true,
  );
  assert.equal(
    shouldShowAccountGroupNextRecoveryStep({
      showRecoveryPriority: false,
      runtimeSummary: {
        tone: "ok",
        label: "Running cleanly",
        detail: "No issues detected.",
      },
    }),
    false,
  );

  assert.equal(
    shouldShowAccountGroupRecoverySnapshot({
      recentErrorCount: 0,
      recentWarningCount: 0,
      recentLifecycleCount: 0,
      recentHealthCount: 0,
      latestPreviewMessage: undefined,
    }),
    false,
  );
  assert.equal(
    shouldShowAccountGroupRecoverySnapshot({
      recentErrorCount: 0,
      recentWarningCount: 0,
      recentLifecycleCount: 1,
      recentHealthCount: 0,
      latestPreviewMessage: undefined,
    }),
    true,
  );

  assert.equal(
    shouldShowAccountGroupRecoveryTrail({
      showRecoverySnapshot: false,
      severityLabel: "No recent updates",
      lifecycleHeadline: "No lifecycle actions captured yet.",
    }),
    false,
  );
  assert.equal(
    shouldShowAccountGroupRecoveryTrail({
      showRecoverySnapshot: true,
      severityLabel: "No recent updates",
      lifecycleHeadline: "No lifecycle actions captured yet.",
    }),
    true,
  );
});
