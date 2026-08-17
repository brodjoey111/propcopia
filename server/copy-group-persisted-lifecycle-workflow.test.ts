import test from "node:test";
import assert from "node:assert/strict";
import { CopyGroupManager } from "./copy-group-manager";
import { runCopyGroupLifecycleAction } from "./copy-group-lifecycle-action";
import type {
  CopyFollower,
  CopyGroup,
  CopyGroupRuntimeState,
} from "./copy-group-types";

function createGroup(): CopyGroup {
  return {
    groupId: "group-1",
    userId: "user-1",
    name: "Primary Copy Group",
    masterAccountId: "master-1",
    followerAccountIds: ["follower-1"],
    groupSettings: { enabled: true },
    riskSettings: { onRiskBreach: "PAUSE" },
    executionSettings: {
      mode: "SIMULATED",
      maxRetries: 0,
      retryDelayMs: 1000,
      orderTimeoutMs: 5000,
      flattenOnEmergencyStop: false,
    },
    createdAt: "2026-08-17T12:00:00.000Z",
    updatedAt: "2026-08-17T12:00:00.000Z",
  };
}

function createFollowers(): CopyFollower[] {
  return [
    {
      groupId: "group-1",
      followerAccountId: "follower-1",
      enabled: true,
      createdAt: "2026-08-17T12:00:00.000Z",
      updatedAt: "2026-08-17T12:00:00.000Z",
    },
  ];
}

async function runAndCaptureState(input: {
  manager: CopyGroupManager;
  action: "pause" | "resume" | "stop" | "emergency-stop";
  reason?: string;
}): Promise<CopyGroupRuntimeState> {
  let persistedState: CopyGroupRuntimeState | undefined;

  await runCopyGroupLifecycleAction({
    action: input.action,
    groupId: "group-1",
    reason: input.reason,
    manager: input.manager,
    persistState: async (groupId) => {
      persistedState = input.manager.getPersistedState(groupId);
    },
  });

  assert.ok(persistedState);
  return persistedState;
}

function restoreManager(persistedState: CopyGroupRuntimeState) {
  const restored = new CopyGroupManager();
  const runtime = restored.registerGroup(createGroup(), createFollowers(), {
    persistedState,
  });
  return { restored, runtime };
}

test("paused state persists and restores offline with execution paused", async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup(), createFollowers());
  await manager.start("group-1");

  const persistedState = await runAndCaptureState({ manager, action: "pause" });
  const { runtime } = restoreManager(persistedState);

  assert.equal(persistedState.status, "PAUSED");
  assert.equal(runtime.state.status, "PAUSED");
  assert.equal(runtime.state.masterConnected, false);
  assert.equal(runtime.state.connectedFollowerCount, 0);
  assert.equal(runtime.executionManager.isPaused(), true);
});

test("resumed running state restores safely as stopped after reload", async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup(), createFollowers(), {
    persistedState: { status: "PAUSED" },
  });

  const persistedState = await runAndCaptureState({ manager, action: "resume" });
  const { runtime } = restoreManager(persistedState);

  assert.equal(persistedState.status, "STOPPED");
  assert.equal(runtime.state.status, "STOPPED");
  assert.equal(runtime.executionManager.isPaused(), false);
  assert.equal(runtime.executionManager.isKillSwitchActive(), false);
});

test("stopped state persists and restores as a neutral restart state", async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup(), createFollowers());
  await manager.start("group-1");

  const persistedState = await runAndCaptureState({ manager, action: "stop" });
  const { runtime } = restoreManager(persistedState);

  assert.equal(persistedState.status, "STOPPED");
  assert.equal(runtime.state.status, "STOPPED");
  assert.equal(runtime.executionManager.isPaused(), false);
  assert.equal(runtime.executionManager.isKillSwitchActive(), false);
});

test("emergency-stop state and reason persist with the kill switch active", async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup(), createFollowers());
  await manager.start("group-1");

  const persistedState = await runAndCaptureState({
    manager,
    action: "emergency-stop",
    reason: "manual safety review",
  });
  const { runtime } = restoreManager(persistedState);

  assert.equal(persistedState.status, "EMERGENCY_STOPPED");
  assert.equal(persistedState.emergencyStopReason, "manual safety review");
  assert.equal(runtime.state.status, "EMERGENCY_STOPPED");
  assert.equal(runtime.state.emergencyStopReason, "manual safety review");
  assert.equal(runtime.executionManager.isKillSwitchActive(), true);
});
