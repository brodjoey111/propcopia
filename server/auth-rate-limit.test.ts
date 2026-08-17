import assert from "node:assert/strict";
import test from "node:test";
import {
  AttemptRateLimiter,
  buildAuthRateLimitKey,
  createAuthRateLimitMiddleware,
} from "./auth-rate-limit.ts";

test("authentication attempts are limited within a fixed window", () => {
  const limiter = new AttemptRateLimiter(2, 10_000);
  assert.deepEqual(limiter.consume("login:ip", 1_000), { allowed: true, remaining: 1, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume("login:ip", 2_000), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume("login:ip", 3_000), { allowed: false, remaining: 0, retryAfterSeconds: 8 });
  assert.equal(limiter.consume("login:ip", 11_000).allowed, true);
});

test("successful authentication resets the attempt window", () => {
  const limiter = new AttemptRateLimiter(1);
  limiter.consume("login:ip", 1_000);
  assert.equal(limiter.consume("login:ip", 1_001).allowed, false);
  limiter.reset("login:ip");
  assert.equal(limiter.consume("login:ip", 1_002).allowed, true);
});

test("tracked authentication keys remain bounded", () => {
  const limiter = new AttemptRateLimiter(10, 10_000, 2);
  limiter.consume("one", 1_000);
  limiter.consume("two", 1_000);
  limiter.consume("three", 1_000);
  assert.equal(limiter.trackedKeyCount, 2);
});

test("password changes use a user key while public authentication uses IP", () => {
  assert.equal(buildAuthRateLimitKey({ path: "/api/auth/login", ip: "127.0.0.1", userId: "user-1" }), "/api/auth/login:ip:127.0.0.1");
  assert.equal(buildAuthRateLimitKey({ path: "/api/auth/change-password", ip: "127.0.0.1", userId: "user-1" }), "/api/auth/change-password:user:user-1");
});

test("middleware returns retry guidance after the limit is reached", () => {
  const middleware = createAuthRateLimitMiddleware(new AttemptRateLimiter(1, 60_000));
  const headers = new Map<string, string>();
  let statusCode = 200;
  let payload: unknown;
  let nextCalls = 0;
  const request = { path: "/api/auth/login", ip: "127.0.0.1", session: {} } as any;
  const response = {
    setHeader: (name: string, value: string) => headers.set(name, value),
    status: (value: number) => { statusCode = value; return response; },
    json: (value: unknown) => { payload = value; return response; },
  } as any;

  middleware(request, response, () => { nextCalls += 1; });
  middleware(request, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(statusCode, 429);
  assert.equal(Number(headers.get("Retry-After")) > 0, true);
  assert.deepEqual(payload, {
    success: false,
    message: "Too many authentication attempts. Please wait and try again.",
  });
});
