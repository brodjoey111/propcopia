import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("saved Rithmic reconnect authenticates without rerunning account discovery", () => {
  assert.match(
    routesSource,
    /existing\.platform === "Rithmic"[\s\S]*?reconnectSavedRithmicAccountForUser\(/,
  );
  assert.doesNotMatch(
    routesSource,
    /existing\.platform === "Rithmic"[\s\S]*?const connectionTest = await rithmicAPI\.testConnection\(\);/,
  );
});

test("saved Rithmic reconnect tolerates account identity refresh failures after login", () => {
  assert.match(
    routesSource,
    /refreshRithmicAccountIdentity\(savedAccount, userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\)/,
  );
});

test("saved Rithmic reconnect delegates session cleanup and validation to the shared service", () => {
  assert.match(routesSource, /sessions: rithmicInstances\.forUser\(userId\),/);
  assert.match(routesSource, /validationStore: rithmicReconnectValidationStore,/);
  assert.match(routesSource, /createSession: \(credentials\) => new RithmicAPI\(credentials\),/);
  assert.match(routesSource, /if \(!reconnect\.success\) \{/);
  assert.match(routesSource, /existing = reconnect\.account;/);
});
