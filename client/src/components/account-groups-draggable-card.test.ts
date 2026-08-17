import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupsDraggableCardBadgeLabel,
  getAccountGroupsDraggableCardBalance,
  getAccountGroupsDraggableCardConnectionState,
  getAccountGroupsDraggableCardPnl,
  getAccountGroupsDraggableCardPnlLabel,
  getAccountGroupsDraggableCardPnlToneClass,
  getAccountGroupsDraggableCardRiskToneClass,
} from "@/components/account-groups-draggable-card";

test("account groups draggable card keeps drag hooks, compact copy, and master transfer adornment together", () => {
  const source = readFileSync("client/src/components/account-groups-draggable-card.tsx", "utf8");

  assert.match(source, /useDraggable/);
  assert.match(source, /useDroppable/);
  assert.match(source, /getAccountGroupsDraggableCardBalance/);
  assert.match(source, /getAccountGroupsDraggableCardPnl/);
  assert.match(source, /getAccountGroupsDraggableCardPnlToneClass/);
  assert.match(source, /getAccountGroupsDraggableCardPnlLabel/);
  assert.match(source, /getAccountGroupsDraggableCardBadgeLabel/);
  assert.match(source, /getAccountGroupsDraggableCardConnectionState/);
  assert.match(source, /getAccountGroupsDraggableCardRiskToneClass/);
  assert.match(source, /Compact view keeps account detail lighter\./);
  assert.match(source, /Drag to transfer master to another account/);
  assert.match(source, /<AccountGroupCardHeader/);
  assert.match(source, /<AccountGroupCardConnectionAction/);
});

test("draggable card helpers normalize balance, pnl, badge labels, and risk tone classes", () => {
  assert.equal(getAccountGroupsDraggableCardBalance("1250.50"), 1250.5);
  assert.equal(getAccountGroupsDraggableCardBalance(null), 0);
  assert.equal(getAccountGroupsDraggableCardPnl("-25.75"), -25.75);
  assert.equal(getAccountGroupsDraggableCardPnl(undefined), 0);
  assert.equal(getAccountGroupsDraggableCardPnlToneClass(25), "text-green-600");
  assert.equal(getAccountGroupsDraggableCardPnlToneClass(-25), "text-red-500");
  assert.equal(getAccountGroupsDraggableCardPnlLabel(25.75), "+$25.75");
  assert.equal(getAccountGroupsDraggableCardPnlLabel(-25.75), "$25.75");

  assert.deepEqual(getAccountGroupsDraggableCardConnectionState(true), {
    label: "Live",
    dotClass: "bg-green-500",
    textClass: "text-emerald-600",
  });
  assert.deepEqual(getAccountGroupsDraggableCardConnectionState(false), {
    label: "Off",
    dotClass: "bg-muted-foreground/40",
    textClass: "text-muted-foreground",
  });

  assert.equal(
    getAccountGroupsDraggableCardBadgeLabel({
      accountType: "follower",
      isMaster: undefined,
    }),
    "follower",
  );
  assert.equal(
    getAccountGroupsDraggableCardBadgeLabel({
      accountType: "follower",
      isMaster: true,
    }),
    "master",
  );
  assert.equal(
    getAccountGroupsDraggableCardBadgeLabel({
      accountType: "master",
      isMaster: false,
    }),
    "follower",
  );

  assert.equal(
    getAccountGroupsDraggableCardRiskToneClass("ok"),
    "border-emerald-400/20 text-emerald-300",
  );
  assert.equal(
    getAccountGroupsDraggableCardRiskToneClass("warn"),
    "border-amber-400/20 text-amber-300",
  );
  assert.equal(
    getAccountGroupsDraggableCardRiskToneClass("danger"),
    "border-red-400/20 text-red-300",
  );
  assert.equal(
    getAccountGroupsDraggableCardRiskToneClass("muted"),
    "text-muted-foreground",
  );
});
