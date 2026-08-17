import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupLaneDroppableIds,
  buildAccountGroupLaneRenameAction,
} from "@/components/account-group-lane";

test("account group lane keeps droppable wiring and extracted lane composition together", () => {
  const source = readFileSync("client/src/components/account-group-lane.tsx", "utf8");

  assert.match(source, /useDroppable/);
  assert.match(source, /buildAccountGroupLaneRenameAction/);
  assert.match(source, /buildAccountGroupLaneDroppableIds/);
  assert.match(source, /buildAccountGroupLaneMasterToken/);
  assert.match(source, /<AccountGroupLaneSummary/);
  assert.match(source, /<AccountGroupLaneCards/);
  assert.match(source, /<AccountGroupMasterSlot/);
});

test("lane droppable id helper keeps lane and master-clear ids aligned", () => {
  assert.deepEqual(buildAccountGroupLaneDroppableIds("group-42"), {
    laneId: "group-42",
    masterClearId: "master-clear:group-42",
  });
});

test("lane rename helper trims names, skips blank values, and always exits edit mode", () => {
  const calls: string[] = [];
  const rename = buildAccountGroupLaneRenameAction({
    groupId: "group-1",
    editName: "  Desk Alpha  ",
    onRename: (id, name) => {
      calls.push(`rename:${id}:${name}`);
    },
    setEditing: (value) => {
      calls.push(`editing:${value}`);
    },
  });

  rename();

  const blankRename = buildAccountGroupLaneRenameAction({
    groupId: "group-2",
    editName: "   ",
    onRename: (id, name) => {
      calls.push(`rename:${id}:${name}`);
    },
    setEditing: (value) => {
      calls.push(`editing:${value}`);
    },
  });

  blankRename();

  assert.deepEqual(calls, [
    "rename:group-1:Desk Alpha",
    "editing:false",
    "editing:false",
  ]);
});
