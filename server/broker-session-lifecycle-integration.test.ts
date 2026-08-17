import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");
const route = source.slice(
  source.indexOf('app.post("/api/rithmic/test-connection"'),
  source.indexOf('app.get("/api/accounts/:id/rithmic-readiness"'),
);

test("failed Rithmic connection tests disconnect candidate sessions", () => {
  assert.match(route, /await disconnectBrokerSessionQuietly\(rithmicAPI\)/);
  assert.match(route, /if \(candidateSession\) \{\s*await disconnectBrokerSessionQuietly\(candidateSession\)/);
});

test("successful Rithmic connection tests safely replace prior sessions", () => {
  assert.match(route, /await replaceBrokerSession\(rithmicInstances, username, rithmicAPI\)/);
  assert.match(route, /candidateSession = undefined/);
});
