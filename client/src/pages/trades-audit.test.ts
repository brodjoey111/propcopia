import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("trades page surfaces shared operator audit details in expanded execution records", () => {
  const source = readFileSync("client/src/pages/trades.tsx", "utf8");

  assert.match(source, /toTradeHistoryRows\(records\)/);
  assert.match(source, /Shared operator audit/);
  assert.match(source, /Reviewed \{reviewedExecutionCount\}/);
  assert.match(source, /Owned \{ownedExecutionCount\}/);
  assert.match(source, /Reassigned \{reassignedExecutionCount\}/);
  assert.match(source, /Operator Audit/);
  assert.match(source, /Operator owner:/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /Latest ownership reason:/);
  assert.match(source, /Ownership Timeline/);
});
