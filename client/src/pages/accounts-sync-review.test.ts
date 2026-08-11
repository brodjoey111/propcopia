import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("accounts page surfaces shared position sync review state", () => {
  const source = readFileSync("client/src/pages/accounts.tsx", "utf8");

  assert.match(source, /\/api\/position-sync\/reviews/);
  assert.match(source, /toPositionSyncWorkflowState\(positionSyncWorkflowData\.reviews\)/);
  assert.match(source, /buildPositionSyncWorkflowKey\(group\.groupId, follower\.followerAccountId\)/);
  assert.match(source, /Approved/);
  assert.match(source, /Handed Off/);
  assert.match(source, /Completed Manually/);
  assert.match(source, /Reviewed/);
  assert.match(source, /Simulated/);
  assert.match(source, /Review note:/);
  assert.match(source, /Operator owner:/);
  assert.match(source, /Ownership changes:/);
  assert.match(source, /Latest ownership reason:/);
  assert.match(source, /Ownership Timeline/);
  assert.match(source, /Approved on/);
  assert.match(source, /Handed off on/);
  assert.match(source, /Completed manually on/);
});
