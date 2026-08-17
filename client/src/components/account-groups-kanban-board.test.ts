import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateAccountGroupsLaneTotalPnl,
  getAccountGroupsKanbanBoardAddGroupLabel,
} from "@/components/account-groups-kanban-board";

test("account groups kanban board keeps lane rendering, add-group CTA, and drag overlay together", () => {
  const source = readFileSync("client/src/components/account-groups-kanban-board.tsx", "utf8");

  assert.match(source, /<DndContext/);
  assert.match(source, /lanes\.map\(\(lane\)/);
  assert.match(source, /calculateAccountGroupsLaneTotalPnl/);
  assert.match(source, /getAccountGroupsKanbanBoardAddGroupLabel/);
  assert.match(source, /renderLane\(lane, totalPnl\)/);
  assert.match(source, /onClick=\{onAddGroup\}/);
  assert.match(source, /<DragOverlay dropAnimation=\{null\}>/);
  assert.match(source, /renderOverlay/);
});

test("kanban board lane total P&L helper sums mixed numeric and string account values safely", () => {
  assert.equal(
    calculateAccountGroupsLaneTotalPnl([
      { pnl: "125.5" },
      { pnl: -25 },
      { pnl: null },
      { pnl: "0" },
      {},
    ]),
    100.5,
  );

  assert.equal(getAccountGroupsKanbanBoardAddGroupLabel(), "Add Group");
});
