import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard execution follow-up grid keeps shared review controls and ownership context", () => {
  const source = readFileSync("client/src/components/dashboard-execution-follow-up-grid.tsx", "utf8");

  assert.match(source, /Compact view/);
  assert.match(source, /Detailed view/);
  assert.match(source, /Add a shared execution note/);
  assert.match(source, /Compact view keeps the dashboard lighter\. Switch to detailed view for notes and ownership history\./);
  assert.match(source, /Take ownership/);
  assert.match(source, /Save note/);
  assert.match(source, /Reopen/);
  assert.match(source, /Mark Reviewed/);
  assert.match(source, /Operator owner:/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Reviewed\{/);
  assert.match(source, /Recheck This Execution/);
  assert.match(source, /ExecutionFollowUpSignalSummary/);
  assert.match(source, /checkpoint=\{item\.checkpoint\}/);
  assert.match(source, /recoveryWindow=\{item\.recoveryWindow\}/);
});
