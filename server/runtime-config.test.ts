import assert from "node:assert/strict";
import test from "node:test";
import {
  DEVELOPMENT_SESSION_SECRET,
  buildLivenessPayload,
  buildRuntimeConfig,
} from "./runtime-config.ts";

test("development runtime uses safe local defaults", () => {
  assert.deepEqual(buildRuntimeConfig({}), {
    environment: "development",
    port: 5000,
    sessionSecret: DEVELOPMENT_SESSION_SECRET,
  });
});

test("production requires a non-default session secret of sufficient length", () => {
  assert.throws(() => buildRuntimeConfig({ NODE_ENV: "production" }), /SESSION_SECRET/);
  assert.throws(
    () => buildRuntimeConfig({ NODE_ENV: "production", SESSION_SECRET: DEVELOPMENT_SESSION_SECRET }),
    /SESSION_SECRET/,
  );
  assert.throws(
    () => buildRuntimeConfig({ NODE_ENV: "production", SESSION_SECRET: "too-short" }),
    /at least 32 characters/,
  );

  const config = buildRuntimeConfig({
    NODE_ENV: "production",
    SESSION_SECRET: "a-secure-production-session-secret-value",
    PORT: "8080",
  });
  assert.equal(config.environment, "production");
  assert.equal(config.port, 8080);
});

test("runtime rejects invalid ports", () => {
  for (const port of ["0", "65536", "5000.5", "not-a-port"]) {
    assert.throws(() => buildRuntimeConfig({ PORT: port }), /PORT/);
  }
});

test("liveness payload is bounded and contains no configuration secrets", () => {
  const payload = buildLivenessPayload({ environment: "test" }, 1_000, 6_500);
  assert.deepEqual(payload, {
    status: "ok",
    service: "propcopia",
    environment: "test",
    uptimeSeconds: 5,
    timestamp: "1970-01-01T00:00:06.500Z",
  });
  assert.doesNotMatch(JSON.stringify(payload), /secret|database|rithmic/i);
});
