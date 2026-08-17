import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeGroupAssignments,
  normalizeTradingGroups,
} from "@/components/account-groups-model";

test("account groups model centralizes demo fixtures and local board persistence helpers", () => {
  const modelSource = readFileSync(
    "client/src/components/account-groups-model.ts",
    "utf8",
  );

  assert.match(modelSource, /export interface TradingGroup/);
  assert.match(modelSource, /export const DEMO_ACCOUNTS: Account\[]/);
  assert.match(modelSource, /export const DEMO_GROUPS: TradingGroup\[]/);
  assert.match(modelSource, /export const DEMO_ASSIGNMENTS: Record<string, string>/);
  assert.match(modelSource, /export const UNGROUPED_ID = "__ungrouped__"/);
  assert.match(modelSource, /export const PALETTE = \[/);
  assert.match(modelSource, /export function loadGroups\(\): TradingGroup\[]/);
  assert.match(modelSource, /localStorage\.getItem\("trading-groups-v1"\)/);
  assert.match(modelSource, /export function loadAssignments\(\): Record<string, string>/);
  assert.match(modelSource, /localStorage\.getItem\("group-assignments-v1"\)/);
  assert.match(modelSource, /export function saveGroups\(groups: TradingGroup\[\]\)/);
  assert.match(modelSource, /export function saveAssignments\(assignments: Record<string, string>\)/);
});

test("account groups model normalizes saved trading groups and fills safe defaults", () => {
  const normalized = normalizeTradingGroups([
    {
      id: "group-1",
      name: "Desk A",
      color: "#3b82f6",
      isActive: false,
      masterId: "master-1",
      disabledAccountIds: ["follower-1", 42, null],
    },
    {
      id: "group-2",
      name: "Desk B",
      color: "#22c55e",
      runtimePreference: "emergency_stopped",
    },
    {
      id: 7,
      name: "Broken",
      color: "#ef4444",
    },
  ]);

  assert.deepEqual(normalized, [
    {
      id: "group-1",
      name: "Desk A",
      color: "#3b82f6",
      isActive: false,
      masterId: "master-1",
      disabledAccountIds: ["follower-1"],
      runtimePreference: "paused",
    },
    {
      id: "group-2",
      name: "Desk B",
      color: "#22c55e",
      isActive: true,
      masterId: null,
      disabledAccountIds: [],
      runtimePreference: "emergency_stopped",
    },
  ]);
});

test("account groups model normalizes saved assignments and drops malformed values", () => {
  const normalized = normalizeGroupAssignments({
    "acct-1": "group-1",
    "acct-2": 2,
    "acct-3": null,
    "acct-4": "group-4",
  });

  assert.deepEqual(normalized, {
    "acct-1": "group-1",
    "acct-4": "group-4",
  });
});
