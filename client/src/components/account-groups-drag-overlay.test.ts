import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveAccountGroupsDragOverlayContent } from "@/components/account-groups-drag-overlay";

test("account groups drag overlay keeps the master-transfer badge in one place", () => {
  const source = readFileSync("client/src/components/account-groups-drag-overlay.tsx", "utf8");
  const badgeSource = readFileSync(
    "client/src/components/account-groups-master-drag-badge.tsx",
    "utf8",
  );

  assert.match(source, /resolveAccountGroupsDragOverlayContent/);
  assert.match(source, /<AccountGroupsMasterDragBadge \/>/);
  assert.match(badgeSource, /Set as Master/);
  assert.match(badgeSource, /<Crown/);
});

test("drag overlay helper preserves an explicit overlay card and falls back to the master badge", () => {
  const explicitOverlay = "overlay-card";

  assert.equal(
    resolveAccountGroupsDragOverlayContent(explicitOverlay),
    explicitOverlay,
  );
  assert.ok(resolveAccountGroupsDragOverlayContent(null));
});
