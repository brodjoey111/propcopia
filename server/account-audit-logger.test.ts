import assert from "node:assert/strict";
import test from "node:test";

import { logAccountAuditEvent } from "./account-audit-logger";

test("account audit events include stable identifiers and no credential-bearing fields", () => {
  const entries: Array<{ event: string; context: Record<string, unknown> }> = [];
  logAccountAuditEvent(
    "connected",
    {
      userId: "user-1",
      accountId: "account-1",
      platform: "Rithmic",
      accountType: "master",
    },
    {
      info: (event, context) => entries.push({ event, context }),
    },
  );

  assert.deepEqual(entries, [{
    event: "account.connected",
    context: {
      userId: "user-1",
      accountId: "account-1",
      platform: "Rithmic",
      accountType: "master",
    },
  }]);
  assert.doesNotMatch(JSON.stringify(entries), /password|username|apiKey|credential|balance|accountName/i);
});

test("role-change audit events preserve the prior role", () => {
  const entries: Array<Record<string, unknown>> = [];
  logAccountAuditEvent(
    "role_changed",
    {
      userId: "user-1",
      accountId: "account-1",
      platform: "Rithmic",
      accountType: "follower",
      previousAccountType: "master",
    },
    { info: (_event, context) => entries.push(context) },
  );

  assert.equal(entries[0]?.previousAccountType, "master");
  assert.equal(entries[0]?.accountType, "follower");
});
