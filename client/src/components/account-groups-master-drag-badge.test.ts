import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getAccountGroupsMasterDragBadgeLabel } from "@/components/account-groups-master-drag-badge";

test("account groups master drag badge keeps the shared master-transfer copy and icon together", () => {
  const source = readFileSync(
    "client/src/components/account-groups-master-drag-badge.tsx",
    "utf8",
  );

  assert.match(source, /AccountGroupsMasterDragBadge/);
  assert.match(source, /getAccountGroupsMasterDragBadgeLabel/);
  assert.match(source, /<Crown/);

  assert.equal(getAccountGroupsMasterDragBadgeLabel(), "Set as Master");
});
