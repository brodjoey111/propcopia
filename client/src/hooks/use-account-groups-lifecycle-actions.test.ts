import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getAccountGroupsLifecycleStatusMessage } from "@/hooks/use-account-groups-lifecycle-actions";

test("account groups lifecycle actions keep runtime updates and lane persistence centralized", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-lifecycle-actions.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsLifecycleActions/);
  assert.match(source, /const \[pendingLifecycleGroupId, setPendingLifecycleGroupId\] = useState<string \| null>\(null\)/);
  assert.match(source, /const setGroupRuntimePreference = \(/);
  assert.match(source, /const syncSingleGroupRegistration = async \(/);
  assert.match(source, /await apiRequest\("POST", "\/api\/copy-groups\/register", payload\)/);
  assert.match(source, /const invalidateCopyGroupQueries = async \(/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/copy-groups\/snapshot"\] \}\)/);
  assert.match(source, /const persistUngroupedLaneName = async \(name: string\) => \{/);
  assert.match(source, /apiRequest\("PATCH", "\/api\/user\/settings", \{/);
  assert.match(source, /queryClient\.setQueryData\(\["\/api\/auth\/me"\], payload\)/);
  assert.match(source, /const applyGroupRuntimePreference = async \(/);
  assert.match(source, /getAccountGroupsLifecycleStatusMessage/);
  assert.match(source, /title: "Group update failed"/);
});

test("lifecycle status helper describes the ready state", () => {
  assert.deepEqual(getAccountGroupsLifecycleStatusMessage("ready"), {
    title: "Group ready",
    description: "This group is saved in a safe ready state.",
    auditLabel: "Group ready",
    auditDetail: "The operator saved this copy group in a ready state.",
  });
});

test("lifecycle status helper describes the paused state", () => {
  assert.deepEqual(getAccountGroupsLifecycleStatusMessage("paused"), {
    title: "Group paused",
    description: "This group will stay paused until you change it.",
    auditLabel: "Group paused",
    auditDetail: "The operator paused this copy group from the board.",
  });
});

test("lifecycle status helper describes the emergency-stop state", () => {
  assert.deepEqual(getAccountGroupsLifecycleStatusMessage("emergency_stopped"), {
    title: "Emergency stop applied",
    description: "This group is locked until you clear the stop.",
    auditLabel: "Emergency stop applied",
    auditDetail: "The operator applied an emergency stop to this copy group.",
  });
});
