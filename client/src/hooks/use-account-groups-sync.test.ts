import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildAccountGroupsSyncSignature,
  selectAccountGroupsSyncInputs,
} from "@/hooks/use-account-groups-sync";

test("account groups sync hook keeps snapshot hydration and registration sync centralized", () => {
  const source = readFileSync("client/src/hooks/use-account-groups-sync.ts", "utf8");

  assert.match(source, /useAccountGroupsSync/);
  assert.match(source, /hydrateBoardStateFromSnapshot/);
  assert.match(source, /buildCopyGroupSyncPlan/);
  assert.match(source, /syncSignatureRef/);
  assert.match(source, /hydratedBoardSignatureRef/);
  assert.match(source, /selectAccountGroupsSyncInputs/);
  assert.match(source, /buildAccountGroupsSyncSignature/);
  assert.match(source, /localStorage\.setItem\("group-risk-settings-v1", nextSettingsSignature\)/);
  assert.match(source, /await apiRequest\("DELETE", `\/api\/copy-groups\/\$\{groupId\}`\)/);
  assert.match(source, /await apiRequest\("POST", "\/api\/copy-groups\/register", payload\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/copy-groups\/snapshot"\] \}\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/runtime\/accounts-overview"\] \}\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/runtime\/dashboard-overview"\] \}\)/);
});

test("sync input selector excludes running groups from sync work", () => {
  const selected = selectAccountGroupsSyncInputs(
    {
      groups: [
        { group: { group: { groupId: "group-a" } } },
        { group: { group: { groupId: "group-b" } } },
      ],
      runningGroups: ["group-b"],
    } as any,
    [
      { id: "group-a" },
      { id: "group-b" },
      { id: "group-c" },
    ] as any[],
  );

  assert.deepEqual(
    selected.syncableGroups.map((group) => group.id),
    ["group-a", "group-c"],
  );
  assert.deepEqual(selected.registeredGroupIds, ["group-a"]);
  assert.equal(selected.runningGroupIds.has("group-b"), true);
});

test("sync signature helper produces a stable sorted signature", () => {
  const first = buildAccountGroupsSyncSignature({
    payloads: [{ groupId: "group-a" }],
    removedGroupIds: ["group-z"],
    runningGroupIds: new Set(["group-b", "group-a"]),
  });

  const second = buildAccountGroupsSyncSignature({
    payloads: [{ groupId: "group-a" }],
    removedGroupIds: ["group-z"],
    runningGroupIds: new Set(["group-a", "group-b"]),
  });

  assert.equal(first, second);
  assert.match(first, /"runningGroupIds":\["group-a","group-b"\]/);
});
