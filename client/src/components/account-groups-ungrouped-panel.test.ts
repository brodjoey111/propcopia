import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupsUngroupedBoardHint,
  getAccountGroupsUngroupedCountLabel,
  shouldShowAccountGroupsUngroupedEmptyState,
} from "@/components/account-groups-ungrouped-panel";

test("account groups ungrouped panel keeps empty and roster states together", () => {
  const source = readFileSync(
    "client/src/components/account-groups-ungrouped-panel.tsx",
    "utf8",
  );

  assert.match(source, /AccountGroupsUngroupedPanel/);
  assert.match(source, /shouldShowAccountGroupsUngroupedEmptyState/);
  assert.match(source, /getAccountGroupsUngroupedCountLabel/);
  assert.match(source, /getAccountGroupsUngroupedBoardHint/);
  assert.match(source, /All accounts are in a group/);
  assert.match(source, /Switch to Board to drag accounts between groups\./);
  assert.match(source, /not assigned to any group/);
  assert.match(source, /<DndContext key=\{account\.id\} sensors=\{sensors\}>/);
  assert.match(source, /renderAccountCard\(account\)/);
});

test("ungrouped panel helpers preserve empty-state and count-label behavior", () => {
  assert.equal(shouldShowAccountGroupsUngroupedEmptyState(0), true);
  assert.equal(shouldShowAccountGroupsUngroupedEmptyState(2), false);

  assert.equal(
    getAccountGroupsUngroupedCountLabel(1),
    "1 account not assigned to any group.",
  );
  assert.equal(
    getAccountGroupsUngroupedCountLabel(3),
    "3 accounts not assigned to any group.",
  );

  assert.equal(
    getAccountGroupsUngroupedBoardHint(),
    "Switch to Board to drag accounts between groups.",
  );
});
