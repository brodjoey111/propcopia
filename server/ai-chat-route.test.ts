import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");

test("AI chat route uses structured logging and a fixed safe failure message", () => {
  const routeStart = source.indexOf('app.post("/api/chat"');
  const routeEnd = source.indexOf("  const wss = new WebSocketServer", routeStart);
  const routeSource = source.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(routeSource, /operationalLogger\.error\("ai\.chat_failed"/);
  assert.match(routeSource, /message: "Failed to get AI response"/);
  assert.doesNotMatch(routeSource, /Error in AI chat:/);
  assert.doesNotMatch(
    routeSource,
    /message: error instanceof Error \? error\.message : 'Failed to get AI response'/,
  );
});
