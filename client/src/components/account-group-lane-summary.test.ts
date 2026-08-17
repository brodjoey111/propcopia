import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupLaneHeaderProps,
  buildAccountGroupRuntimeStripProps,
  shouldShowAccountGroupRuntimeStrip,
} from "@/components/account-group-lane-summary";

test("account group lane summary keeps header and runtime strip composition together", () => {
  const source = readFileSync("client/src/components/account-group-lane-summary.tsx", "utf8");

  assert.match(source, /buildAccountGroupLaneHeaderProps/);
  assert.match(source, /buildAccountGroupRuntimeStripProps/);
  assert.match(source, /shouldShowAccountGroupRuntimeStrip/);
  assert.match(source, /<AccountGroupLaneHeader \{\.\.\.headerProps\} \/>/);
  assert.match(source, /<AccountGroupRuntimeStrip \{\.\.\.runtimeStripProps\} \/>/);
});

test("lane summary prop builders preserve header and runtime-strip state wiring", () => {
  const props = {
    group: { id: "group-1", name: "Desk", color: "#3b82f6" },
    accounts: [{ id: "acct-1" }, { id: "acct-2" }],
    isUngrouped: false,
    isDemo: false,
    totalPnl: 125,
    accentColor: "#3b82f6",
    isActive: true,
    editing: false,
    editName: "Desk",
    setEditName: () => undefined,
    setEditing: () => undefined,
    showPalette: false,
    setShowPalette: () => undefined,
    commitRename: () => undefined,
    onDelete: () => undefined,
    onColorChange: () => undefined,
    masterToken: "master-token",
    resolvedRuntimeStatus: "RUNNING",
    lifecycleActionPending: false,
    onStartGroup: () => undefined,
    onPauseGroup: () => undefined,
    onResumeGroup: () => undefined,
    onEmergencyStopGroup: () => undefined,
    onResetGroup: () => undefined,
    hasMasterWarning: false,
    riskSettings: { maxContracts: 2 },
    onSaveRisk: () => undefined,
    onClearRisk: () => undefined,
    groupRiskToneClass: "risk-tone",
    groupBoardStateLabel: "Routing ready",
    historyOpen: false,
    setHistoryOpen: () => undefined,
    historyActivity: [],
    historyObservability: null,
    historyLoading: false,
    historyError: null,
    palette: ["#3b82f6"] as const,
    runtimeLoading: false,
    runtimeUnavailable: false,
    runtimeSummary: {
      tone: "ok",
      label: "Running cleanly",
      detail: "No recent issues.",
    },
    groupBoardState: {
      tone: "ok",
      label: "Routing ready",
      detail: "Follower routing is healthy.",
    },
    routingGate: {
      tone: "warn",
      label: "Resume gate",
      detail: "Reconnect one follower before resuming this group.",
    },
    recentErrorCount: 0,
    recentWarningCount: 1,
    recentLifecycleCount: 2,
    recentHealthCount: 3,
    latestPreviewMessage: "Latest runtime preview",
    latestOperatorAction: "Operator resumed the group.",
    holdReason: "Waiting on follower readiness.",
    operatorSummary: {
      headline: "Operator resumed the group.",
      detail: "Followers are being monitored.",
    },
  } as const;

  const headerProps = buildAccountGroupLaneHeaderProps(props);
  const runtimeStripProps = buildAccountGroupRuntimeStripProps(props);

  assert.equal(headerProps.masterToken, "master-token");
  assert.equal(headerProps.groupBoardState.detail, "Follower routing is healthy.");
  assert.equal(headerProps.latestOperatorAction, "Operator resumed the group.");
  assert.equal(headerProps.holdReason, "Waiting on follower readiness.");

  assert.equal(runtimeStripProps.accountsCount, 2);
  assert.equal(runtimeStripProps.groupBoardState.label, "Routing ready");
  assert.equal(runtimeStripProps.routingGate.label, "Resume gate");
  assert.equal(runtimeStripProps.routingGate.detail, "Reconnect one follower before resuming this group.");
  assert.equal(runtimeStripProps.latestPreviewMessage, "Latest runtime preview");
  assert.equal(runtimeStripProps.operatorSummary?.headline, "Operator resumed the group.");
});

test("lane summary runtime-strip helper hides runtime details for the ungrouped lane only", () => {
  assert.equal(shouldShowAccountGroupRuntimeStrip(false), true);
  assert.equal(shouldShowAccountGroupRuntimeStrip(undefined), true);
  assert.equal(shouldShowAccountGroupRuntimeStrip(true), false);
});
