import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupsBoardLaneLifecycleActions,
  buildAccountGroupsBoardLaneRuntimeProps,
} from "@/components/account-groups-board-lane";

test("account groups board lane centralizes lifecycle action mapping for runtime preferences", () => {
  const source = readFileSync(
    "client/src/components/account-groups-board-lane.tsx",
    "utf8",
  );

  assert.match(source, /buildAccountGroupsBoardLaneLifecycleActions/);
  assert.match(source, /buildAccountGroupsBoardLaneRuntimeProps/);
  assert.match(source, /onStartGroup=\{lifecycleActions\.onStartGroup\}/);
  assert.match(source, /onPauseGroup=\{lifecycleActions\.onPauseGroup\}/);
  assert.match(source, /onResumeGroup=\{lifecycleActions\.onResumeGroup\}/);
  assert.match(source, /onEmergencyStopGroup=\{lifecycleActions\.onEmergencyStopGroup\}/);
  assert.match(source, /onResetGroup=\{lifecycleActions\.onResetGroup\}/);
});

test("board lane lifecycle actions map controls to the expected runtime preferences", () => {
  const calls: Array<{
    groupId: string;
    preference: "ready" | "paused" | "emergency_stopped";
  }> = [];
  const lifecycleActions = buildAccountGroupsBoardLaneLifecycleActions(
    (groupId, preference) => {
      calls.push({ groupId, preference });
    },
  );

  lifecycleActions.onStartGroup("group-1");
  lifecycleActions.onPauseGroup("group-1");
  lifecycleActions.onResumeGroup("group-1");
  lifecycleActions.onEmergencyStopGroup("group-1");
  lifecycleActions.onResetGroup("group-1");

  assert.deepEqual(calls, [
    { groupId: "group-1", preference: "ready" },
    { groupId: "group-1", preference: "paused" },
    { groupId: "group-1", preference: "ready" },
    { groupId: "group-1", preference: "emergency_stopped" },
    { groupId: "group-1", preference: "ready" },
  ]);
});

test("board lane runtime helper preserves runtime payload, loading flags, and compact-view state", () => {
  const runtimeProps = buildAccountGroupsBoardLaneRuntimeProps({
    runtime: {
      runtimeStatus: "PAUSED",
      runtimeSummary: {
        tone: "warn",
        label: "Paused",
        detail: "Waiting for resume.",
      },
      recentActivityPreview: [
        {
          eventId: "evt-1",
          groupId: "group-1",
          timestamp: "2026-08-12T12:00:00.000Z",
          severity: "WARN",
          category: "LIFECYCLE",
          message: "Copy group paused.",
        },
      ],
      operatorSummary: {
        headline: "Group paused",
        detail: "Paused from the board.",
      },
    },
    runtimeLoading: true,
    runtimeUnavailable: false,
    lifecycleActionPending: true,
    compactView: true,
  });

  assert.equal(runtimeProps.runtimeStatus, "PAUSED");
  assert.equal(runtimeProps.runtimeSummary?.label, "Paused");
  assert.equal(runtimeProps.recentActivityPreview[0]?.message, "Copy group paused.");
  assert.equal(runtimeProps.runtimeLoading, true);
  assert.equal(runtimeProps.runtimeUnavailable, false);
  assert.equal(runtimeProps.lifecycleActionPending, true);
  assert.equal(runtimeProps.operatorSummary?.headline, "Group paused");
  assert.equal(runtimeProps.compactView, true);
});
