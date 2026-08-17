import assert from "node:assert/strict";
import test from "node:test";
import { OperationalLogger, sanitizeOperationalValue } from "./operational-logger.ts";

test("operational log sanitization recursively removes credentials and URL secrets", () => {
  const sanitized = sanitizeOperationalValue({
    username: "operator",
    password: "never-log-password",
    nested: {
      apiKey: "never-log-key",
      url: "https://example.test/data?token=never-log-token&symbol=ES",
      authorization: "Bearer never-log-bearer",
      detail: "password=inline-secret customer=cus_private123 subscription=sub_private456",
    },
  });
  const output = JSON.stringify(sanitized);

  assert.match(output, /operator/);
  assert.match(output, /\[REDACTED\]/);
  assert.doesNotMatch(output, /never-log-password|never-log-key|never-log-token|never-log-bearer|inline-secret|cus_private123|sub_private456/);
  assert.match(output, /symbol=ES/);
});

test("errors are reduced to a safe name and sanitized message", () => {
  const sanitized = sanitizeOperationalValue(
    new Error("request failed at https://example.test/path?apikey=private-key"),
  );

  assert.deepEqual(sanitized, {
    name: "Error",
    message: "request failed at https://example.test/path?apikey=[REDACTED]",
  });
});

test("structured logger emits bounded JSON through the selected level writer", () => {
  const lines: string[] = [];
  const logger = new OperationalLogger("test-service", {
    info: (line) => lines.push(line),
    warn: (line) => lines.push(line),
    error: (line) => lines.push(line),
  });

  logger.error("auth.login_failed", {
    password: "hidden",
    detail: "x".repeat(1200),
  });

  const entry = JSON.parse(lines[0]!);
  assert.equal(entry.level, "error");
  assert.equal(entry.service, "test-service");
  assert.equal(entry.event, "auth.login_failed");
  assert.equal(entry.context.password, "[REDACTED]");
  assert.match(entry.context.detail, /\[truncated\]$/);
  assert.equal(lines[0]!.includes("hidden"), false);
});
