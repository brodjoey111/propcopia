import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

test("liveness route is registered before session and database-backed middleware", () => {
  const healthIndex = source.indexOf('app.get("/api/health"');
  const sessionIndex = source.indexOf("session({");

  assert.notEqual(healthIndex, -1);
  assert.notEqual(sessionIndex, -1);
  assert.equal(healthIndex < sessionIndex, true);
  assert.match(source, /buildLivenessPayload\(runtimeConfig, startedAtMs\)/);
});

test("server startup uses validated runtime configuration", () => {
  assert.match(source, /buildRuntimeConfig\(process\.env\)/);
  assert.match(source, /secret: runtimeConfig\.sessionSecret/);
  assert.match(source, /const port = runtimeConfig\.port/);
  assert.doesNotMatch(source, /process\.env\.SESSION_SECRET \|\|/);
});
