import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accountsSource = readFileSync(new URL("./accounts.tsx", import.meta.url), "utf8");
const cardSource = readFileSync(
  new URL("../components/account-card.tsx", import.meta.url),
  "utf8",
);

test("accounts views label balance and position sources independently", () => {
  assert.match(accountsSource, /hasLiveBalance=\{viewModel\.hasLiveBalance\}/);
  assert.match(accountsSource, /hasLivePositionData=\{viewModel\.hasLivePositionData\}/);
  assert.match(accountsSource, /viewModel\.hasLiveBalance \? 'Balance' : 'Saved Balance'/);
  assert.match(accountsSource, /viewModel\.hasLivePositionData \? 'Unrealized P&L' : 'Saved P&L'/);
  assert.match(accountsSource, /viewModel\.hasLivePositionData \? 'Positions' : 'Saved Positions'/);
});

test("account cards explain partial live-data coverage", () => {
  assert.match(cardSource, /hasLiveBalance \? "Balance" : "Saved Balance"/);
  assert.match(cardSource, /hasLivePositionData \? "Unrealized P&L" : "Saved P&L"/);
  assert.match(cardSource, /Live balance is available\. P&L and positions still show saved values\./);
  assert.match(cardSource, /Live P&L and positions are available\. Balance still shows its saved value\./);
});
