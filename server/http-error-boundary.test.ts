import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHttpError } from "./http-error-boundary.ts";

test("client errors preserve actionable public messages", () => {
  assert.deepEqual(normalizeHttpError({ status: 404, message: "Copy group not found" }), {
    statusCode: 404,
    publicMessage: "Copy group not found",
    logLevel: "warn",
  });
});

test("server errors do not expose internal details", () => {
  assert.deepEqual(normalizeHttpError({ statusCode: 503, message: "DATABASE_URL password=secret" }), {
    statusCode: 503,
    publicMessage: "Internal Server Error",
    logLevel: "error",
  });
});

test("unknown and invalid errors safely fall back to status 500", () => {
  for (const error of [undefined, "failure", { status: 200 }, { statusCode: 700 }]) {
    assert.deepEqual(normalizeHttpError(error), {
      statusCode: 500,
      publicMessage: "Internal Server Error",
      logLevel: "error",
    });
  }
});

test("client errors without a message use a bounded fallback", () => {
  assert.deepEqual(normalizeHttpError({ statusCode: 400, message: "  " }), {
    statusCode: 400,
    publicMessage: "Request could not be completed",
    logLevel: "warn",
  });
});
