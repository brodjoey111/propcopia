import assert from "node:assert/strict";
import test from "node:test";
import { buildRequestLogDecision } from "./request-observability.ts";

test("successful API reads and health checks stay quiet", () => {
  assert.equal(buildRequestLogDecision({ method: "GET", path: "/api/notifications", statusCode: 200, durationMs: 20 }), null);
  assert.equal(buildRequestLogDecision({ method: "GET", path: "/api/health", statusCode: 200, durationMs: 1 }), null);
  assert.equal(buildRequestLogDecision({ method: "GET", path: "/assets/index.js", statusCode: 200, durationMs: 10 }), null);
});

test("state-changing API requests log bounded request metadata only", () => {
  assert.deepEqual(buildRequestLogDecision({
    method: "post",
    path: "/api/copy-groups",
    statusCode: 201,
    durationMs: 32.4,
    userId: "user-1",
  }), {
    level: "info",
    event: "http.request_completed",
    context: {
      method: "POST",
      path: "/api/copy-groups",
      statusCode: 201,
      durationMs: 32,
      userId: "user-1",
    },
  });
});

test("client and server errors use warning and error levels", () => {
  assert.equal(buildRequestLogDecision({ method: "GET", path: "/api/missing", statusCode: 404, durationMs: 12 })?.level, "warn");
  assert.equal(buildRequestLogDecision({ method: "POST", path: "/api/copy-groups", statusCode: 500, durationMs: 15 })?.level, "error");
});

test("slow API reads remain observable without logging response data", () => {
  const decision = buildRequestLogDecision({ method: "GET", path: "/api/trade-history", statusCode: 200, durationMs: 500 });

  assert.equal(decision?.event, "http.request_slow");
  assert.deepEqual(Object.keys(decision?.context ?? {}).sort(), ["durationMs", "method", "path", "statusCode"]);
});
