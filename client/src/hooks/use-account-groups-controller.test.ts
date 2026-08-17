import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAccountGroupsControllerRuntimeState } from "@/hooks/use-account-groups-controller";

test("account groups controller hook centralizes page orchestration and board state composition", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-controller.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsController/);
  assert.match(source, /const isDemo = options\.accounts\.length === 0/);
  assert.match(source, /useAccountGroupsBoardPreferences\(\{/);
  assert.match(source, /useAccountGroupsRuntimeState\(\{/);
  assert.match(source, /useAccountGroupsSync\(\{/);
  assert.match(source, /useAccountGroupsViewController\(\{/);
  assert.match(source, /useAccountGroupsLifecycleActions\(\{/);
  assert.match(source, /useAccountGroupsBoardActions\(\{/);
  assert.match(source, /useAccountGroupsRenderData\(\{/);
  assert.match(source, /buildAccountGroupsControllerRuntimeState/);
  assert.match(source, /useAccountGroupsBoardContentState\(\{/);
  assert.match(source, /boardContentState/);
});

test("controller runtime-state helper preserves the board runtime snapshot fields", () => {
  const runtimeState = buildAccountGroupsControllerRuntimeState({
    laneRuntimeByGroupId: new Map([["group-1", { runtimeStatus: "READY" }]] as any),
    isCopyGroupSnapshotLoading: true,
    isCopyGroupSnapshotError: false,
    pendingLifecycleGroupId: "group-1",
    boardView: "compact",
    isMasterTokenDrag: true,
    activeAccount: { id: "acct-1" } as any,
  });

  assert.equal(runtimeState.isCopyGroupSnapshotLoading, true);
  assert.equal(runtimeState.isCopyGroupSnapshotError, false);
  assert.equal(runtimeState.pendingLifecycleGroupId, "group-1");
  assert.equal(runtimeState.boardView, "compact");
  assert.equal(runtimeState.isMasterTokenDrag, true);
  assert.equal(runtimeState.activeAccount?.id, "acct-1");
  assert.equal(runtimeState.laneRuntimeByGroupId.get("group-1")?.runtimeStatus, "READY");
});
