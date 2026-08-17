import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("activity operator audit board keeps manual sync watchlist lanes together", () => {
  const source = readFileSync("client/src/components/activity-operator-audit-board.tsx", "utf8");

  assert.match(source, /ActivityOperatorAuditBoard/);
  assert.match(source, /Operator Audit/);
  assert.match(source, /Manual sync ownership watchlist/);
  assert.match(source, /Review overdue follow-up, unassigned work, and items that have already changed hands\./);
  assert.match(source, /Overdue/);
  assert.match(source, /Unassigned/);
  assert.match(source, /Reassigned/);
  assert.match(source, /No overdue manual sync items right now\./);
  assert.match(source, /Every active manual sync item has an owner\./);
  assert.match(source, /No ownership changes have been logged yet\./);
  assert.match(source, /Ready for ownership claim/);
  assert.match(source, /Needs operator completion owner/);
  assert.match(source, /minutes in current stage/);
  assert.match(source, /minutes since last workflow change/);
  assert.match(source, /ownership change/);
});
