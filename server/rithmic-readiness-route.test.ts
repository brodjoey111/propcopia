import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("Rithmic readiness route is account-scoped and requires an authenticated session", () => {
  assert.match(routesSource, /app\.get\(\"\/api\/accounts\/:id\/rithmic-readiness\"/);
  assert.match(routesSource, /if \(!req\.session\.userId\) \{/);
  assert.match(routesSource, /message: \"Not authenticated\"/);
});

test("Rithmic readiness route loads the saved account and rejects non-Rithmic accounts", () => {
  assert.match(
    routesSource,
    /where\(and\(eq\(accounts\.id, id\), eq\(accounts\.userId, req\.session\.userId\)\)\)/,
  );
  assert.match(routesSource, /if \(existing\.platform !== "Rithmic"\) \{/);
  assert.match(routesSource, /message: "Rithmic readiness is only available for Rithmic accounts\."/);
});

test("Rithmic readiness route builds the readiness payload from the cached Rithmic session", () => {
  assert.match(routesSource, /const instance = existing\.rithmicUsername \? rithmicInstances\.get\(existing\.rithmicUsername\) : undefined;/);
  assert.match(routesSource, /const reconnectValidation = rithmicReconnectValidationStore\.get\(existing\.id\);/);
  assert.match(routesSource, /const readiness = buildRithmicReadiness\(existing, instance, reconnectValidation\);/);
  assert.match(routesSource, /return res\.json\(\{\s*success: true,\s*readiness,\s*\}\);/);
});

test("Rithmic readiness revalidate route authenticates the saved account and refreshes reconnect proof", () => {
  assert.match(routesSource, /app\.post\(\"\/api\/accounts\/:id\/rithmic-readiness\/revalidate\"/);
  assert.match(routesSource, /const rithmicAPI = new RithmicAPI\(\{/);
  assert.match(routesSource, /const connectionTest = await rithmicAPI\.authenticate\(\);/);
  assert.match(
    routesSource,
    /existing = await refreshRithmicAccountIdentity\(existing, req\.session\.userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\);/,
  );
  assert.match(
    routesSource,
    /rithmicReconnectValidationStore\.markValidated\(existing\.id,\s*\{\s*validatedAt: new Date\(\)\.toISOString\(\),\s*source: "saved_connect",\s*\}\);/,
  );
  assert.match(routesSource, /const readiness = buildRithmicReadiness\(existing, rithmicAPI, reconnectValidation\);/);
});
