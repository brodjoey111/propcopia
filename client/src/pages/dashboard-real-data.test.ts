import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./dashboard.tsx", import.meta.url), "utf8");
const rosterSource = readFileSync(
  new URL("../components/dashboard-account-roster-panel.tsx", import.meta.url),
  "utf8",
);
const runtimeOverviewSource = readFileSync(
  new URL("../../../server/runtime-overview-service.ts", import.meta.url),
  "utf8",
);

test("dashboard does not automatically create mock accounts, P&L, or positions", () => {
  assert.doesNotMatch(source, /const mockAccounts/);
  assert.doesNotMatch(source, /const mockPnlSeries/);
  assert.doesNotMatch(source, /const mockPositions/);
  assert.doesNotMatch(source, /accounts\.length === 0/);
});

test("dashboard does not estimate unavailable broker metrics", () => {
  assert.doesNotMatch(source, /numericPnl \* 0\.28/);
  assert.doesNotMatch(source, /totalBalance \* 1\.92/);
  assert.doesNotMatch(runtimeOverviewSource, /totalBalance \* 1\.92/);
  assert.match(runtimeOverviewSource, /totalBuyingPower: null/);
  assert.match(source, /const totalBuyingPower: number \| null = null/);
});

test("dashboard and roster label saved and verified values separately", () => {
  assert.match(source, /Verified Broker Data/);
  assert.match(source, /Mixed Broker and Saved Data/);
  assert.match(source, /dashboardAccounts\.every\(\(account\) => account\.hasLiveBalance\)/);
  assert.match(source, /Saved Daily P&L/);
  assert.match(rosterSource, /verified broker values/);
  assert.match(rosterSource, /saved values only/);
  assert.match(rosterSource, /Unavailable/);
});
