import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const tradeLoggerSource = readFileSync(new URL("./trade-logger.ts", import.meta.url), "utf8");

test("authentication failures use structured operational logging", () => {
  assert.match(routesSource, /operationalLogger\.error\("auth\.signup_failed", \{ error \}\)/);
  assert.match(routesSource, /operationalLogger\.error\("auth\.login_failed", \{ error \}\)/);
  assert.match(routesSource, /operationalLogger\.error\("auth\.password_change_failed"/);
  assert.doesNotMatch(routesSource, /console\.error\(['"]Signup error:/);
  assert.doesNotMatch(routesSource, /console\.error\(['"]Login error:/);
});

test("trade logger sanitizes errors before forwarding them to an injected writer", () => {
  assert.match(tradeLoggerSource, /sanitizeOperationalValue\(err\)/);
  assert.match(tradeLoggerSource, /sanitizeOperationalValue\(error\)/);
});
