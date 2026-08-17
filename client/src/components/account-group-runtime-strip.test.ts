import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupBoardStateBadgeClass,
  getAccountGroupBoardStateDetailClass,
  getAccountGroupBoardStatePanelClass,
  shouldShowAccountGroupEmergencyBanner,
  shouldShowAccountGroupPausedBanner,
  shouldShowAccountGroupReloadRecoveryBanner,
  shouldShowAccountGroupRoutingPosture,
  getAccountGroupRuntimeSummaryDetailClass,
  getAccountGroupRuntimeSummaryLabelClass,
  getAccountGroupRuntimeSummaryPanelClass,
  shouldShowAccountGroupRoutingGate,
} from "@/components/account-group-runtime-strip";

test("account group runtime strip keeps recovery and operator status messaging together", () => {
  const source = readFileSync("client/src/components/account-group-runtime-strip.tsx", "utf8");
  const stateSource = readFileSync(
    "client/src/hooks/use-account-group-runtime-strip-state.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupRuntimeStripState/);
  assert.match(source, /getSignalMixToneClass/);
  assert.match(source, /getRecoverySeverityToneClass/);
  assert.match(source, /getAccountGroupRuntimeSummaryPanelClass/);
  assert.match(source, /getAccountGroupRuntimeSummaryLabelClass/);
  assert.match(source, /getAccountGroupRuntimeSummaryDetailClass/);
  assert.match(source, /getAccountGroupBoardStatePanelClass/);
  assert.match(source, /getAccountGroupBoardStateBadgeClass/);
  assert.match(source, /getAccountGroupBoardStateDetailClass/);
  assert.match(source, /shouldShowAccountGroupReloadRecoveryBanner/);
  assert.match(source, /shouldShowAccountGroupPausedBanner/);
  assert.match(source, /shouldShowAccountGroupEmergencyBanner/);
  assert.match(source, /shouldShowAccountGroupRoutingGate/);
  assert.match(source, /shouldShowAccountGroupRoutingPosture/);
  assert.match(stateSource, /describeNextRecoveryStep/);
  assert.match(stateSource, /buildRecoveryChecklist/);
  assert.match(stateSource, /const signalMixBadges = recoverySummary\.categoryBadges\.filter/);
  assert.match(source, /Status unavailable/);
  assert.match(source, /Operator update/);
  assert.match(source, /Routing gate/);
  assert.match(source, /routingGate\.label/);
  assert.match(source, /routingGate\.detail/);
  assert.match(source, /runtimeSummary\?\.label === "Restored offline"/);
  assert.match(source, /Recovery Snapshot/);
  assert.match(source, /Recovery priority/);
  assert.match(source, /Next recovery step/);
  assert.match(source, /Recovery checklist/);
  assert.match(source, /recoveryChecklist\.map/);
  assert.match(source, /Signal mix/);
  assert.match(source, /Recovery trail/);
  assert.match(source, /Incident level/);
  assert.match(source, /Signal freshness/);
  assert.match(source, /recoverySummary\.signalFreshnessLabel/);
  assert.match(source, /recoverySummary\.signalFreshnessDetail/);
  assert.match(source, /Severity detail/);
  assert.match(source, /recoverySummary\.severityTone/);
  assert.match(source, /recoverySummary\.severityLabel/);
  assert.match(source, /Restart recovery/);
  assert.match(source, /recoverySummary\.restartSignalLabel/);
  assert.match(source, /recoverySummary\.restartSignalDetail/);
  assert.match(source, /Lifecycle pulse/);
  assert.match(source, /recoverySummary\.lifecycleHeadline/);
  assert.match(source, /recoverySummary\.lifecycleDetail/);
  assert.match(source, /Routing posture/);
  assert.match(source, /groupBoardState\.label/);
  assert.match(source, /groupBoardState\.detail/);
  assert.match(source, /Last operator action/);
  assert.match(source, /Hold reason/);
  assert.match(source, /Emergency stop active/);
});

test("runtime strip tone helpers preserve summary and routing posture styling", () => {
  assert.equal(
    getAccountGroupRuntimeSummaryPanelClass("danger"),
    "bg-red-500/10 border-red-500/20",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryPanelClass("warn"),
    "bg-amber-500/10 border-amber-500/20",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryPanelClass("ok"),
    "bg-emerald-500/10 border-emerald-500/20",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryPanelClass("muted"),
    "bg-white/[0.03] border-white/8",
  );

  assert.equal(
    getAccountGroupRuntimeSummaryLabelClass("danger"),
    "text-red-300",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryLabelClass("warn"),
    "text-amber-300",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryLabelClass("ok"),
    "text-emerald-300",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryLabelClass("muted"),
    "text-zinc-300",
  );

  assert.equal(
    getAccountGroupRuntimeSummaryDetailClass("danger"),
    "text-red-200/80",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryDetailClass("warn"),
    "text-amber-100/80",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryDetailClass("ok"),
    "text-emerald-100/80",
  );
  assert.equal(
    getAccountGroupRuntimeSummaryDetailClass("muted"),
    "text-zinc-400",
  );

  assert.equal(
    getAccountGroupBoardStatePanelClass("danger"),
    "bg-red-500/10 border-red-500/20",
  );
  assert.equal(
    getAccountGroupBoardStatePanelClass("warn"),
    "bg-amber-500/10 border-amber-500/20",
  );
  assert.equal(
    getAccountGroupBoardStatePanelClass("muted"),
    "bg-white/[0.04] border-white/8",
  );

  assert.equal(
    getAccountGroupBoardStateBadgeClass("danger"),
    "border-red-500/20 bg-red-500/10 text-red-200",
  );
  assert.equal(
    getAccountGroupBoardStateBadgeClass("warn"),
    "border-amber-500/20 bg-amber-500/10 text-amber-100",
  );
  assert.equal(
    getAccountGroupBoardStateBadgeClass("muted"),
    "border-white/10 bg-white/[0.04] text-zinc-300",
  );

  assert.equal(
    getAccountGroupBoardStateDetailClass("danger"),
    "text-red-200/80",
  );
  assert.equal(
    getAccountGroupBoardStateDetailClass("warn"),
    "text-amber-100/80",
  );
  assert.equal(
    getAccountGroupBoardStateDetailClass("muted"),
    "text-zinc-300",
  );

  assert.equal(
    shouldShowAccountGroupReloadRecoveryBanner({
      tone: "warn",
      label: "Restored offline",
      detail: "Recovered after restart.",
    }),
    true,
  );
  assert.equal(
    shouldShowAccountGroupReloadRecoveryBanner({
      tone: "ok",
      label: "Running cleanly",
      detail: "No issues detected.",
    }),
    false,
  );

  assert.equal(shouldShowAccountGroupPausedBanner("PAUSED", 2), true);
  assert.equal(shouldShowAccountGroupPausedBanner("PAUSED", 0), false);
  assert.equal(shouldShowAccountGroupPausedBanner("RUNNING", 2), false);

  assert.equal(
    shouldShowAccountGroupEmergencyBanner("EMERGENCY_STOPPED", 1),
    true,
  );
  assert.equal(
    shouldShowAccountGroupEmergencyBanner("EMERGENCY_STOPPED", 0),
    false,
  );
  assert.equal(
    shouldShowAccountGroupEmergencyBanner("PAUSED", 1),
    false,
  );

  assert.equal(
    shouldShowAccountGroupRoutingPosture("RUNNING", true, "warn"),
    true,
  );
  assert.equal(
    shouldShowAccountGroupRoutingPosture("EMERGENCY_STOPPED", true, "warn"),
    false,
  );
  assert.equal(
    shouldShowAccountGroupRoutingPosture("RUNNING", false, "warn"),
    false,
  );
  assert.equal(
    shouldShowAccountGroupRoutingPosture("RUNNING", true, "ok"),
    false,
  );

  assert.equal(
    shouldShowAccountGroupRoutingGate({
      resolvedRuntimeStatus: "PAUSED",
      accountsCount: 2,
      routingGateTone: "ok",
    }),
    true,
  );
  assert.equal(
    shouldShowAccountGroupRoutingGate({
      resolvedRuntimeStatus: "RUNNING",
      accountsCount: 2,
      routingGateTone: "muted",
    }),
    false,
  );
  assert.equal(
    shouldShowAccountGroupRoutingGate({
      resolvedRuntimeStatus: "RUNNING",
      accountsCount: 2,
      routingGateTone: "warn",
    }),
    true,
  );
});
