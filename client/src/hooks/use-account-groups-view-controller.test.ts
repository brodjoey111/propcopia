import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupsPersistenceAdapters,
  selectAccountGroupsViewData,
} from "@/hooks/use-account-groups-view-controller";

test("account groups view controller centralizes display selection, sensors, persistence wrappers, and add-group trigger handling", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-view-controller.ts",
    "utf8",
  );

  assert.match(source, /export function selectAccountGroupsViewData/);
  assert.match(source, /displayAccounts: options\.isDemo \? options\.demoAccounts : options\.accounts/);
  assert.match(source, /displayGroups: options\.isDemo \? options\.demoGroups : options\.groups/);
  assert.match(source, /displayAssign: options\.isDemo/);
  assert.match(source, /const sensors = useSensors\(/);
  assert.match(source, /useSensor\(PointerSensor, \{ activationConstraint: \{ distance: 8 \} \}\)/);
  assert.match(source, /useSensor\(TouchSensor,/);
  assert.match(source, /selectAccountGroupsViewData/);
  assert.match(source, /buildAccountGroupsPersistenceAdapters/);
  assert.match(source, /export function useAccountGroupsAddGroupTrigger/);
  assert.match(source, /useEffect\(\(\) => \{/);
  assert.match(source, /if \(!options\.addGroupTrigger\)/);
  assert.match(source, /options\.addGroup\(\)/);
});

test("view controller selects demo or live board data from one helper", () => {
  const liveSelection = selectAccountGroupsViewData({
    isDemo: false,
    accounts: [{ id: "live-account" }] as never,
    demoAccounts: [{ id: "demo-account" }] as never,
    groups: [{ id: "live-group" }] as never,
    demoGroups: [{ id: "demo-group" }] as never,
    assignments: { "live-account": "live-group" },
    demoAssignments: { "demo-account": "demo-group" },
  });

  assert.equal((liveSelection.displayAccounts[0] as { id: string }).id, "live-account");
  assert.equal((liveSelection.displayGroups[0] as { id: string }).id, "live-group");
  assert.equal(liveSelection.displayAssign["live-account"], "live-group");

  const demoSelection = selectAccountGroupsViewData({
    isDemo: true,
    accounts: [{ id: "live-account" }] as never,
    demoAccounts: [{ id: "demo-account" }] as never,
    groups: [{ id: "live-group" }] as never,
    demoGroups: [{ id: "demo-group" }] as never,
    assignments: { "live-account": "live-group" },
    demoAssignments: { "demo-account": "demo-group" },
  });

  assert.equal((demoSelection.displayAccounts[0] as { id: string }).id, "demo-account");
  assert.equal((demoSelection.displayGroups[0] as { id: string }).id, "demo-group");
  assert.equal(demoSelection.displayAssign["demo-account"], "demo-group");
});

test("view controller persistence adapters update state and saved snapshots together", () => {
  const calls: string[] = [];
  const adapters = buildAccountGroupsPersistenceAdapters({
    setGroups: (next) => {
      calls.push(`set-groups:${next.length}`);
    },
    setAssignments: (next) => {
      calls.push(`set-assignments:${Object.keys(next).length}`);
    },
    persistSavedGroups: (next) => {
      calls.push(`persist-groups:${next.length}`);
    },
    persistSavedAssignments: (next) => {
      calls.push(`persist-assignments:${Object.keys(next).length}`);
    },
  });

  adapters.persistGroups([{ id: "group-1" }] as never);
  adapters.persistAssignments({ "acct-1": "group-1" });

  assert.deepEqual(calls, [
    "set-groups:1",
    "persist-groups:1",
    "set-assignments:1",
    "persist-assignments:1",
  ]);
});
