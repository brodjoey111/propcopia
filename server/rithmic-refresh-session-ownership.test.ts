import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");
const refreshIdentity = source.slice(
  source.indexOf("async function refreshRithmicAccountIdentity"),
  source.indexOf("async function reconnectSavedRithmicAccountForUser"),
);

test("Rithmic identity refresh does not register coordinator-owned sessions", () => {
  assert.match(refreshIdentity, /const ownsNewSession = !rithmicApi && !existingApi/);
  assert.match(
    refreshIdentity,
    /if \(ownsNewSession\) \{\s*await replaceBrokerSession\(userRithmicInstances, account\.rithmicUsername, api\)/,
  );
  assert.doesNotMatch(refreshIdentity, /rithmicInstances\.set\(/);
});

test("Rithmic identity refresh closes locally-created sessions after discovery failure", () => {
  assert.match(
    refreshIdentity,
    /if \(!connectionTest\.success\) \{\s*if \(ownsNewSession\) \{\s*await disconnectBrokerSessionQuietly\(api\)/,
  );
});
