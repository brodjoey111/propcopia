import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");

test("broker credential tests use the bounded authentication limiter", () => {
  assert.match(source, /app\.post\("\/api\/tradovate\/test-connection", authRateLimit/);
  assert.match(source, /app\.post\("\/api\/tradeify\/test-connection", authRateLimit/);
  assert.match(source, /app\.post\("\/api\/rithmic\/test-connection", authRateLimit/);
});

test("successful broker connections reset their user-scoped attempt windows", () => {
  const brokerRoutes = source.slice(
    source.indexOf('app.post("/api/tradovate/test-connection"'),
    source.indexOf('app.get("/api/accounts/:id/rithmic-readiness"'),
  );
  const resets = brokerRoutes.match(/authAttemptLimiter\.reset\(buildAuthRateLimitKey\(\{/g) ?? [];

  assert.equal(resets.length, 3);
  assert.equal((brokerRoutes.match(/userId: req\.session\.userId/g) ?? []).length >= 3, true);
});
