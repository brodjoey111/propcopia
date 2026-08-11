import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard runtime overview keeps copy-group payloads lightweight", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /runtimeSummary:\s*buildCopyGroupRuntimeSummary\(/);
  assert.match(source, /Restored offline/);
  assert.match(source, /startsWith\("Recovered copy group "\)/);
  assert.match(source, /activityPreview:\s*recentActivity\.slice\(0,\s*3\)/);
  assert.doesNotMatch(source, /statistics:\s*runtime\.statistics/);
  assert.doesNotMatch(source, /health:\s*runtime\.health/);
  assert.doesNotMatch(source, /activity:\s*runtime\s*\?\s*input\.getRecentActivity/);
});

test("dashboard runtime overview sends execution widget summaries instead of raw recent trade records", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /attentionCards:\s*buildDashboardExecutionAttentionCards\(recentTrades\.slice\(0,\s*4\)\)/);
  assert.match(source, /recentPathRows:\s*buildDashboardExecutionPathRows\(recentTrades\.slice\(0,\s*4\),\s*3\)/);
  assert.doesNotMatch(source, /recentRecords:\s*recentTrades\.slice\(0,\s*4\)/);
});

test("dashboard runtime overview includes a compact headline summary for account and position cards", () => {
  const source = readFileSync("server/runtime-overview-service.ts", "utf8");

  assert.match(source, /dashboardSummary:\s*\{/);
  assert.match(source, /totalAccounts:\s*input\.userAccounts\.length/);
  assert.match(source, /connectedAccounts:\s*input\.userAccounts\.filter\(\(account\) => account\.isConnected\)\.length/);
  assert.match(source, /totalBuyingPower:\s*totalBalance \* 1\.92/);
  assert.match(source, /totalOpenPositions:\s*accountsOverview\.positionSnapshot\.summary\.totalOpenPositions/);
});
