import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard account roster panel keeps account card metrics and controls", () => {
  const source = readFileSync("client/src/components/dashboard-account-roster-panel.tsx", "utf8");

  assert.match(source, /Account Roster/);
  assert.match(source, /Account command cards/);
  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /verified broker values/);
  assert.match(source, /saved values only/);
  assert.match(source, /Load the account roster when you want detailed balance/);
  assert.match(source, /Compact view keeps the roster lighter\. Switch to detailed view for balance, P&amp;L, and account controls context\./);
  assert.match(source, /Balance/);
  assert.match(source, /Saved Balance/);
  assert.match(source, /Open Positions/);
  assert.match(source, /Daily P&amp;L/);
  assert.match(source, /Saved Daily P&amp;L/);
  assert.match(source, /Unrealized/);
  assert.match(source, /Unavailable/);
  assert.match(source, /scaling/);
  assert.match(source, /blocked/);
  assert.match(source, /Connected/);
  assert.match(source, /Not connected/);
  assert.match(source, /Connect/);
  assert.match(source, /Disconnect/);
  assert.match(source, /Configure/);
  assert.match(source, /ConfigureAccountDialog/);
});
