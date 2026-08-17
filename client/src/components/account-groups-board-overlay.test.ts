import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getAccountGroupsBoardOverlayMode } from "@/components/account-groups-board-overlay";

test("account groups board overlay keeps master badge, account card, and empty states together", () => {
  const source = readFileSync(
    "client/src/components/account-groups-board-overlay.tsx",
    "utf8",
  );

  assert.match(source, /getAccountGroupsBoardOverlayMode/);
  assert.match(source, /<AccountGroupsMasterDragBadge \/>/);
  assert.match(source, /<AccountGroupsDraggableCard/);
});

test("board overlay mode helper prioritizes master-token drags, then account cards, then empty state", () => {
  assert.equal(
    getAccountGroupsBoardOverlayMode({
      isMasterTokenDrag: true,
      activeAccount: { id: "acct-1" } as any,
    }),
    "master-badge",
  );

  assert.equal(
    getAccountGroupsBoardOverlayMode({
      isMasterTokenDrag: false,
      activeAccount: { id: "acct-2" } as any,
    }),
    "account-card",
  );

  assert.equal(
    getAccountGroupsBoardOverlayMode({
      isMasterTokenDrag: false,
      activeAccount: null,
    }),
    "empty",
  );
});
