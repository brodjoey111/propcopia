import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupLaneActivitySummary,
  buildAccountGroupLaneRoutingGate,
  describeHoldReason,
  describeLatestOperatorAction,
  findLatestRestartRecoveryMessage,
  getLocalRuntimeStatus,
} from "@/hooks/use-account-group-lane-state";

test("account group lane state hook keeps risk, board-state, and observability summaries together", () => {
  const source = readFileSync("client/src/hooks/use-account-group-lane-state.ts", "utf8");

  assert.match(source, /summarizeGroupRisk/);
  assert.match(source, /describeGroupRiskSummary/);
  assert.match(source, /describeCopyGroupBoardState/);
  assert.match(source, /buildAccountGroupLaneActivitySummary/);
  assert.match(source, /buildAccountGroupLaneRoutingGate/);
  assert.match(source, /const latestOperatorAction = describeLatestOperatorAction/);
  assert.match(source, /const routingGate = buildAccountGroupLaneRoutingGate/);
  assert.match(source, /const holdReason = describeHoldReason/);
});

test("buildAccountGroupLaneActivitySummary counts recent health, warning, error, and lifecycle items", () => {
  const summary = buildAccountGroupLaneActivitySummary([
    {
      eventId: "evt-1",
      groupId: "group-1",
      timestamp: "2026-08-12T12:00:00.000Z",
      severity: "WARN",
      category: "HEALTH",
      message: "Follower lag increased.",
    },
    {
      eventId: "evt-2",
      groupId: "group-1",
      timestamp: "2026-08-12T11:59:00.000Z",
      severity: "ERROR",
      category: "LIFECYCLE",
      message: "Emergency stop activated by operator.",
    },
    {
      eventId: "evt-3",
      groupId: "group-1",
      timestamp: "2026-08-12T11:58:00.000Z",
      severity: "INFO",
      category: "LIFECYCLE",
      message: "Copy group resumed.",
    },
  ]);

  assert.equal(summary.recentWarningCount, 1);
  assert.equal(summary.recentErrorCount, 1);
  assert.equal(summary.recentLifecycleCount, 2);
  assert.equal(summary.recentHealthCount, 1);
  assert.equal(summary.latestPreviewMessage, "Follower lag increased.");
});

test("getLocalRuntimeStatus respects emergency and paused local preferences", () => {
  assert.equal(
    getLocalRuntimeStatus({
      id: "group-1",
      name: "Alpha",
      color: "#fff",
      runtimePreference: "emergency_stopped",
    }),
    "EMERGENCY_STOPPED",
  );

  assert.equal(
    getLocalRuntimeStatus({
      id: "group-2",
      name: "Bravo",
      color: "#fff",
      runtimePreference: "paused",
    }),
    "PAUSED",
  );

  assert.equal(
    getLocalRuntimeStatus({
      id: "group-3",
      name: "Charlie",
      color: "#fff",
      isActive: false,
    }),
    "PAUSED",
  );

  assert.equal(
    getLocalRuntimeStatus({
      id: "group-4",
      name: "Delta",
      color: "#fff",
    }),
    "STOPPED",
  );
});

test("describeLatestOperatorAction translates common lifecycle events into operator-friendly labels", () => {
  assert.equal(
    describeLatestOperatorAction([
      {
        eventId: "evt-1",
        groupId: "group-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        severity: "WARN",
        category: "LIFECYCLE",
        message: "Emergency stop activated by operator.",
      },
    ]),
    "Emergency stop applied",
  );

  assert.equal(
    describeLatestOperatorAction([
      {
        eventId: "evt-2",
        groupId: "group-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Copy group resumed.",
      },
    ]),
    "Resumed by operator",
  );

  assert.equal(
    describeLatestOperatorAction([
      {
        eventId: "evt-3",
        groupId: "group-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Recovered copy group after server restart.",
      },
    ]),
    "Recovered into ready state after reload",
  );

  assert.equal(
    describeLatestOperatorAction([
      {
        eventId: "evt-4",
        groupId: "group-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        severity: "INFO",
        category: "TRADE",
        message: "Follower order filled.",
      },
    ]),
    null,
  );
});

test("lane routing gate mirrors resume and stage requirements from current account readiness", () => {
  const pausedGate = buildAccountGroupLaneRoutingGate({
    resolvedRuntimeStatus: "PAUSED",
    effectiveMasterId: "master-1",
    accounts: [
      { id: "master-1", accountType: "master", isConnected: true },
      { id: "follower-1", accountType: "follower", isConnected: true },
    ] as any,
    disabledIds: [],
    groupRiskTone: "ok",
    recentActivityPreview: [],
  });

  assert.equal(pausedGate.label, "Resume gate");
  assert.match(
    pausedGate.detail,
    /Master and followers look ready\. Resume when the next routing window opens\./,
  );
  assert.equal(pausedGate.tone, "ok");

  const stageGate = buildAccountGroupLaneRoutingGate({
    resolvedRuntimeStatus: "STOPPED",
    effectiveMasterId: "master-1",
    accounts: [
      { id: "master-1", accountType: "master", isConnected: false },
      { id: "follower-1", accountType: "follower", isConnected: true },
    ] as any,
    disabledIds: [],
    groupRiskTone: "ok",
    recentActivityPreview: [
      {
        eventId: "evt-5",
        groupId: "group-1",
        timestamp: "2026-08-12T12:00:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Recovered copy group Alpha into STOPPED state after reload.",
      },
    ],
  });

  assert.equal(stageGate.label, "Stage gate");
  assert.match(
    stageGate.detail,
    /Reconnect the master account before you stage this group again\./,
  );
  assert.equal(stageGate.tone, "danger");
});

test("findLatestRestartRecoveryMessage returns the newest restart recovery entry when present", () => {
  assert.equal(
    findLatestRestartRecoveryMessage([
      {
        eventId: "evt-6",
        groupId: "group-1",
        timestamp: "2026-08-12T12:00:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Recovered copy group Alpha into STOPPED state after reload.",
      },
      {
        eventId: "evt-7",
        groupId: "group-1",
        timestamp: "2026-08-12T11:59:00.000Z",
        severity: "INFO",
        category: "LIFECYCLE",
        message: "Copy group Alpha resumed.",
      },
    ]),
    "Recovered copy group Alpha into STOPPED state after reload.",
  );
});

test("describeHoldReason prioritizes emergency, paused, and risk-based hold messaging", () => {
  assert.equal(
    describeHoldReason({
      runtimeStatus: "EMERGENCY_STOPPED",
      runtimeSummary: {
        tone: "danger",
        label: "Emergency stop",
        detail: "The group is blocked.",
      },
      riskDetail: {
        detail: "Follower drawdown breach still active.",
        tone: "danger",
      },
      recentActivityPreview: [
        {
          eventId: "evt-5",
          groupId: "group-1",
          timestamp: "2026-08-11T12:00:00.000Z",
          severity: "ERROR",
          category: "LIFECYCLE",
          message: "Emergency stop activated by operator.",
        },
      ],
    }),
    "Emergency stop activated by operator.",
  );

  assert.equal(
    describeHoldReason({
      runtimeStatus: "PAUSED",
      runtimeSummary: {
        tone: "warn",
        label: "Paused",
        detail: "Paused until resumed.",
      },
      riskDetail: {
        detail: "Follower sizing review still needed.",
        tone: "warn",
      },
      recentActivityPreview: [],
    }),
    "Follower sizing review still needed.",
  );

  assert.equal(
    describeHoldReason({
      runtimeStatus: "RUNNING",
      runtimeSummary: {
        tone: "warn",
        label: "Running with risk hold",
        detail: "One follower remains blocked.",
      },
      riskDetail: {
        detail: "One follower remains blocked.",
        tone: "danger",
      },
      recentActivityPreview: [],
    }),
    "One follower remains blocked.",
  );

  assert.equal(
    describeHoldReason({
      runtimeStatus: "RUNNING",
      runtimeSummary: {
        tone: "ok",
        label: "Running",
        detail: "No issues detected.",
      },
      riskDetail: {
        detail: "No issues detected.",
        tone: "ok",
      },
      recentActivityPreview: [],
    }),
    null,
  );
});
