import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupDropZoneEmptyLabel,
  sortAccountGroupDropZoneAccounts,
} from "@/components/account-group-drop-zone";

test("account group drop zone keeps empty-state and master-first ordering together", () => {
  const source = readFileSync("client/src/components/account-group-drop-zone.tsx", "utf8");

  assert.match(source, /getAccountGroupDropZoneEmptyLabel/);
  assert.match(source, /sortAccountGroupDropZoneAccounts/);
  assert.match(source, /Drop accounts here/);
  assert.match(source, /Release to add/);
  assert.match(source, /renderAccountCard\(account\)/);
});

test("drop zone helpers preserve empty-state labels and master-first ordering", () => {
  assert.equal(getAccountGroupDropZoneEmptyLabel(false), "Drop accounts here");
  assert.equal(getAccountGroupDropZoneEmptyLabel(true), "Release to add");

  const ordered = sortAccountGroupDropZoneAccounts(
    [
      { id: "follower-2" },
      { id: "master-1" },
      { id: "follower-1" },
    ] as never,
    "master-1",
  );

  assert.deepEqual(
    ordered.map((account) => account.id),
    ["master-1", "follower-2", "follower-1"],
  );
});
