import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("saved Rithmic reconnect authenticates without rerunning account discovery", () => {
  assert.match(
    routesSource,
    /existing\.platform === "Rithmic"[\s\S]*?const connectionTest = await rithmicAPI\.authenticate\(\);/,
  );
  assert.doesNotMatch(
    routesSource,
    /existing\.platform === "Rithmic"[\s\S]*?const connectionTest = await rithmicAPI\.testConnection\(\);/,
  );
});

test("saved Rithmic reconnect tolerates account identity refresh failures after login", () => {
  assert.match(
    routesSource,
    /refreshRithmicAccountIdentity\(existing, req\.session\.userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\)/,
  );
});
