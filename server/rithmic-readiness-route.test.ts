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

test("Rithmic readiness route builds the readiness payload from the user's cached Rithmic session", () => {
  assert.match(routesSource, /rithmicInstances\.forUser\(req\.session\.userId\)\.get\(existing\.rithmicUsername\)/);
  assert.match(routesSource, /const reconnectValidation = rithmicReconnectValidationStore\.get\(existing\.id\);/);
  assert.match(routesSource, /const readiness = buildRithmicReadiness\(existing, instance, reconnectValidation\);/);
  assert.match(routesSource, /return res\.json\(\{\s*success: true,\s*readiness,\s*\}\);/);
});

test("Rithmic readiness revalidate route uses the shared saved reconnect workflow", () => {
  assert.match(routesSource, /app\.post\(\"\/api\/accounts\/:id\/rithmic-readiness\/revalidate\"/);
  assert.match(routesSource, /const reconnect = await reconnectSavedRithmicAccountForUser\(/);
  assert.match(
    routesSource,
    /refreshIdentity: \(savedAccount, rithmicAPI\) =>\s*refreshRithmicAccountIdentity\(savedAccount, userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\),/,
  );
  assert.match(routesSource, /existing = reconnect\.account;/);
  assert.match(
    routesSource,
    /rithmicInstances\.forUser\(req\.session\.userId\)\.get\(existing\.rithmicUsername\)/,
  );
});
