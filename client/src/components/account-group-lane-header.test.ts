import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupLanePrimaryAction,
  getAccountGroupLaneStatusBadgeToneClass,
  getAccountGroupLaneStatusLabel,
  shouldShowAccountGroupEmergencyAction,
} from "@/components/account-group-lane-header";

test("account group lane header keeps group controls consolidated", () => {
  const source = readFileSync("client/src/components/account-group-lane-header.tsx", "utf8");
  const stateSource = readFileSync(
    "client/src/hooks/use-account-group-runtime-strip-state.ts",
    "utf8",
  );

  assert.match(source, /buildRecoveryActionPlan/);
  assert.match(source, /getAccountGroupLaneStatusBadgeToneClass/);
  assert.match(source, /getAccountGroupLaneStatusLabel/);
  assert.match(source, /getAccountGroupLanePrimaryAction/);
  assert.match(source, /shouldShowAccountGroupEmergencyAction/);
  assert.match(source, /title="Change color"/);
  assert.match(source, /title="Rename group"/);
  assert.match(source, /title="Delete group"/);
  assert.match(stateSource, /Reload review required/);
  assert.match(stateSource, /Hold condition active/);
  assert.match(stateSource, /Routing attention required/);
  assert.match(stateSource, /Operator follow-up queued/);
  assert.match(stateSource, /Manual review required/);
  assert.match(stateSource, /Ready for resume check/);
  assert.match(stateSource, /Master still needed/);
  assert.match(stateSource, /Recovery update in progress/);
  assert.match(source, /Clear Stop/);
  assert.match(source, /Emergency/);
  assert.match(source, /Risk Settings - Custom/);
  assert.match(source, /Risk Settings - Global/);
  assert.match(source, /<AccountGroupHistoryDialog/);
});

test("lane header helpers preserve status labels, tones, and primary lifecycle actions", () => {
  assert.equal(getAccountGroupLaneStatusLabel("RUNNING"), "Running");
  assert.equal(getAccountGroupLaneStatusLabel("PAUSED"), "Paused");
  assert.equal(getAccountGroupLaneStatusLabel("EMERGENCY_STOPPED"), "Emergency Stop");
  assert.equal(getAccountGroupLaneStatusLabel("STARTING"), "Updating");
  assert.equal(getAccountGroupLaneStatusLabel("STOPPED"), "Ready");

  assert.equal(
    getAccountGroupLaneStatusBadgeToneClass("RUNNING"),
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  );
  assert.equal(
    getAccountGroupLaneStatusBadgeToneClass("PAUSED"),
    "border-amber-500/30 bg-amber-500/10 text-amber-400",
  );
  assert.equal(
    getAccountGroupLaneStatusBadgeToneClass("EMERGENCY_STOPPED"),
    "border-red-500/30 bg-red-500/10 text-red-400",
  );

  assert.equal(shouldShowAccountGroupEmergencyAction("RUNNING"), true);
  assert.equal(shouldShowAccountGroupEmergencyAction("PAUSED"), true);
  assert.equal(shouldShowAccountGroupEmergencyAction("STOPPED"), false);
  assert.equal(shouldShowAccountGroupEmergencyAction("EMERGENCY_STOPPED"), false);

  const calls: string[] = [];
  const startAction = getAccountGroupLanePrimaryAction({
    groupId: "group-1",
    resolvedRuntimeStatus: "STOPPED",
    lifecycleActionPending: false,
    hasMasterWarning: false,
    onStartGroup: (groupId) => {
      calls.push(`start:${groupId}`);
    },
  });
  const pauseAction = getAccountGroupLanePrimaryAction({
    groupId: "group-1",
    resolvedRuntimeStatus: "RUNNING",
    lifecycleActionPending: true,
    hasMasterWarning: false,
    onPauseGroup: (groupId) => {
      calls.push(`pause:${groupId}`);
    },
  });
  const clearStopAction = getAccountGroupLanePrimaryAction({
    groupId: "group-1",
    resolvedRuntimeStatus: "EMERGENCY_STOPPED",
    lifecycleActionPending: false,
    hasMasterWarning: false,
    onResetGroup: (groupId) => {
      calls.push(`reset:${groupId}`);
    },
  });

  startAction.onClick();
  pauseAction.onClick();
  clearStopAction.onClick();

  assert.equal(startAction.label, "Start");
  assert.equal(startAction.variant, "default");
  assert.equal(startAction.disabled, false);
  assert.equal(pauseAction.label, "Pause");
  assert.equal(pauseAction.variant, "outline");
  assert.equal(pauseAction.disabled, true);
  assert.equal(clearStopAction.label, "Clear Stop");
  assert.equal(clearStopAction.variant, "outline");
  assert.equal(clearStopAction.disabled, false);
  assert.deepEqual(calls, ["start:group-1", "pause:group-1", "reset:group-1"]);
});
