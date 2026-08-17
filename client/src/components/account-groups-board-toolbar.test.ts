import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACCOUNT_GROUPS_BOARD_SUB_VIEW_OPTIONS,
  ACCOUNT_GROUPS_BOARD_VIEW_OPTIONS,
  shouldShowAccountGroupsBoardKanbanControls,
} from "@/components/account-groups-board-toolbar";

test("account groups board toolbar keeps sub-view tabs and board-mode actions together", () => {
  const source = readFileSync(
    "client/src/components/account-groups-board-toolbar.tsx",
    "utf8",
  );

  assert.match(source, /AccountGroupsBoardToolbar/);
  assert.match(source, /ACCOUNT_GROUPS_BOARD_SUB_VIEW_OPTIONS/);
  assert.match(source, /ACCOUNT_GROUPS_BOARD_VIEW_OPTIONS/);
  assert.match(source, /shouldShowAccountGroupsBoardKanbanControls/);
  assert.match(source, /onSubViewChange\(value\)/);
  assert.match(source, /onBoardViewChange\(value\)/);
  assert.match(source, /onAddGroup/);
  assert.match(source, /Add Group/);
});

test("board toolbar option lists preserve the expected board and sub-view labels", () => {
  assert.deepEqual(
    ACCOUNT_GROUPS_BOARD_SUB_VIEW_OPTIONS.map((option) => option.value),
    ["kanban", "ungrouped"],
  );
  assert.deepEqual(
    ACCOUNT_GROUPS_BOARD_SUB_VIEW_OPTIONS.map((option) => option.label),
    ["Board", "Ungrouped"],
  );
  assert.deepEqual(
    ACCOUNT_GROUPS_BOARD_VIEW_OPTIONS,
    [
      { value: "compact", label: "Compact view" },
      { value: "detailed", label: "Detailed view" },
    ],
  );

  assert.equal(shouldShowAccountGroupsBoardKanbanControls("kanban"), true);
  assert.equal(shouldShowAccountGroupsBoardKanbanControls("ungrouped"), false);
});
