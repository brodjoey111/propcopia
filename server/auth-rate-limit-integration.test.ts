import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("credential-changing routes use the shared authentication limiter", () => {
  assert.match(source, /app\.post\("\/api\/auth\/signup", authRateLimit/);
  assert.match(source, /app\.post\("\/api\/auth\/login", authRateLimit/);
  assert.match(source, /app\.post\("\/api\/auth\/change-password", authRateLimit/);
  assert.match(source, /authAttemptLimiter\.reset/);
});
