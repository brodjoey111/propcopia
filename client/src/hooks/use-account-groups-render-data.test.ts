import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildAccountGroupsBoardLanes,
  isAccountGroupsMasterTokenDrag,
  selectAccountGroupsRenderCollections,
} from "@/hooks/use-account-groups-render-data";

test("account groups render data hook keeps extracted helpers wired into the board data flow", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-render-data.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsRenderData/);
  assert.match(source, /selectAccountGroupsRenderCollections/);
  assert.match(source, /isAccountGroupsMasterTokenDrag/);
  assert.match(source, /buildAccountGroupsBoardLanes/);
  assert.match(source, /const runtimeSummaryByGroupId = new Map/);
  assert.match(source, /const operatorSummaryByGroupId = new Map/);
  assert.match(
    source,
    /const laneRuntimeByGroupId = new Map<string, AccountGroupsBoardLaneRuntime>/,
  );
  assert.match(source, /const getGroupAccounts = \(groupId: string\): Account\[] => \{/);
  assert.match(source, /const ungroupedAccounts = getGroupAccounts\(options\.ungroupedId\)/);
});

test("render collection selector switches between live and demo sources", () => {
  const live = selectAccountGroupsRenderCollections({
    isDemo: false,
    accounts: [{ id: "live-account" }] as any[],
    demoAccounts: [{ id: "demo-account" }] as any[],
    groups: [{ id: "live-group" }] as any[],
    demoGroups: [{ id: "demo-group" }] as any[],
    assignments: { a: "live-group" },
    demoAssignments: { a: "demo-group" },
  });

  assert.equal(live.displayAccounts[0]?.id, "live-account");
  assert.equal(live.displayGroups[0]?.id, "live-group");
  assert.equal(live.displayAssign.a, "live-group");

  const demo = selectAccountGroupsRenderCollections({
    isDemo: true,
    accounts: [{ id: "live-account" }] as any[],
    demoAccounts: [{ id: "demo-account" }] as any[],
    groups: [{ id: "live-group" }] as any[],
    demoGroups: [{ id: "demo-group" }] as any[],
    assignments: { a: "live-group" },
    demoAssignments: { a: "demo-group" },
  });

  assert.equal(demo.displayAccounts[0]?.id, "demo-account");
  assert.equal(demo.displayGroups[0]?.id, "demo-group");
  assert.equal(demo.displayAssign.a, "demo-group");
});

test("master token drag helper only flags master token ids", () => {
  assert.equal(isAccountGroupsMasterTokenDrag("master-token:acct-1"), true);
  assert.equal(isAccountGroupsMasterTokenDrag("master-card-token:acct-2"), true);
  assert.equal(isAccountGroupsMasterTokenDrag("acct-3"), false);
  assert.equal(isAccountGroupsMasterTokenDrag(null), false);
});

test("board lanes helper preserves the ungrouped lane and group ordering", () => {
  const lanes = buildAccountGroupsBoardLanes({
    isDemo: false,
    ungroupedId: "ungrouped",
    ungroupedName: "Unassigned",
    demoUngroupedName: "Demo Unassigned",
    displayGroups: [
      {
        id: "group-1",
        name: "Momentum",
        color: "#123456",
        isActive: true,
        masterId: null,
        disabledAccountIds: [],
      },
      {
        id: "group-2",
        name: "Scalps",
        color: "#654321",
        isActive: false,
        masterId: "acct-2",
        disabledAccountIds: ["acct-5"],
      },
    ],
  });

  assert.equal(lanes[0]?.id, "ungrouped");
  assert.equal(lanes[0]?.name, "Unassigned");
  assert.equal(lanes[0]?.isUngrouped, true);
  assert.equal(lanes[1]?.id, "group-1");
  assert.equal(lanes[1]?.isUngrouped, false);
  assert.equal(lanes[2]?.id, "group-2");
});
