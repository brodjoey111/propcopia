import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAccountGroupLaneToggleEnabledAction } from "@/components/account-group-lane-cards";

test("account group lane cards keep drop-zone wiring and draggable-card rendering together", () => {
  const source = readFileSync("client/src/components/account-group-lane-cards.tsx", "utf8");

  assert.match(source, /<AccountGroupDropZone/);
  assert.match(source, /renderAccountCard=\{\(account\)/);
  assert.match(source, /<AccountGroupLaneCard/);
  assert.match(source, /<AccountGroupsDraggableCard/);
  assert.match(source, /buildAccountGroupLaneToggleEnabledAction/);
  assert.match(source, /buildAccountGroupCardConnectionBindings/);
  assert.match(source, /toAccountRiskBadgeView\(accountRiskById\[account\.id\]\)/);
});

test("lane card toggle helper only binds follower toggles for grouped lanes", () => {
  const calls: string[] = [];
  const groupedAction = buildAccountGroupLaneToggleEnabledAction({
    isUngrouped: false,
    groupId: "group-1",
    accountId: "acct-1",
    onToggleAccount: (groupId, accountId) => {
      calls.push(`${groupId}:${accountId}`);
    },
  });
  const ungroupedAction = buildAccountGroupLaneToggleEnabledAction({
    isUngrouped: true,
    groupId: "group-1",
    accountId: "acct-2",
    onToggleAccount: (groupId, accountId) => {
      calls.push(`${groupId}:${accountId}`);
    },
  });

  groupedAction?.();
  ungroupedAction?.();

  assert.deepEqual(calls, ["group-1:acct-1"]);
  assert.equal(ungroupedAction, undefined);
});
