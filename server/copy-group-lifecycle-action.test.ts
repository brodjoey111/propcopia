import test from "node:test";
import assert from "node:assert/strict";
import {
  runCopyGroupLifecycleAction,
  type CopyGroupLifecycleAction,
  type CopyGroupLifecycleManager,
} from "./copy-group-lifecycle-action";

function createHarness(options: { failAction?: CopyGroupLifecycleAction } = {}) {
  const calls: string[] = [];
  const manager: CopyGroupLifecycleManager = {
    async start(groupId) {
      calls.push(`start:${groupId}`);
      if (options.failAction === "start") throw new Error("start failed");
    },
    async stop(groupId) {
      calls.push(`stop:${groupId}`);
      if (options.failAction === "stop") throw new Error("stop failed");
    },
    pause(groupId) {
      calls.push(`pause:${groupId}`);
      if (options.failAction === "pause") throw new Error("pause failed");
    },
    resume(groupId) {
      calls.push(`resume:${groupId}`);
      if (options.failAction === "resume") throw new Error("resume failed");
    },
    async emergencyStop(groupId, reason) {
      calls.push(`emergency-stop:${groupId}:${reason ?? ""}`);
      if (options.failAction === "emergency-stop") throw new Error("emergency stop failed");
    },
    getRuntime(groupId) {
      calls.push(`runtime:${groupId}`);
      return { groupId, status: "UPDATED" };
    },
  };

  return {
    calls,
    manager,
    persistState: async (groupId: string) => {
      calls.push(`persist:${groupId}`);
    },
  };
}

for (const action of ["start", "stop", "pause", "resume"] as const) {
  test(`${action} route workflow mutates, persists, then returns runtime`, async () => {
    const harness = createHarness();

    const runtime = await runCopyGroupLifecycleAction({
      action,
      groupId: "group-1",
      manager: harness.manager,
      persistState: harness.persistState,
    });

    assert.deepEqual(harness.calls, [
      `${action}:group-1`,
      "persist:group-1",
      "runtime:group-1",
    ]);
    assert.deepEqual(runtime, { groupId: "group-1", status: "UPDATED" });
  });
}

test("emergency-stop route workflow preserves the operator reason", async () => {
  const harness = createHarness();

  await runCopyGroupLifecycleAction({
    action: "emergency-stop",
    groupId: "group-1",
    reason: "manual safety review",
    manager: harness.manager,
    persistState: harness.persistState,
  });

  assert.deepEqual(harness.calls, [
    "emergency-stop:group-1:manual safety review",
    "persist:group-1",
    "runtime:group-1",
  ]);
});

test("failed lifecycle actions are not persisted as successful state", async () => {
  const harness = createHarness({ failAction: "pause" });

  await assert.rejects(
    runCopyGroupLifecycleAction({
      action: "pause",
      groupId: "group-1",
      manager: harness.manager,
      persistState: harness.persistState,
    }),
    { message: "pause failed" },
  );

  assert.deepEqual(harness.calls, ["pause:group-1"]);
});
