import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getAccountGroupMasterSlotStateClass } from "@/components/account-group-master-slot";

test("account group master slot keeps clear-zone highlighting and drop-target shell together", () => {
  const source = readFileSync("client/src/components/account-group-master-slot.tsx", "utf8");

  assert.match(source, /setNodeRef/);
  assert.match(source, /getAccountGroupMasterSlotStateClass/);
  assert.match(source, /title=\{title\}/);
  assert.match(source, /\{children\}/);
});

test("master slot helper returns highlighted and idle classes correctly", () => {
  assert.equal(
    getAccountGroupMasterSlotStateClass(true),
    "ring-2 ring-red-400/70 bg-red-500/10",
  );
  assert.equal(getAccountGroupMasterSlotStateClass(false), "");
});
