import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");

function routeSource(start: string, end: string): string {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

test("broker credential tests require an authenticated session", () => {
  const routes = [
    routeSource('app.post("/api/tradovate/test-connection"', 'app.post("/api/tradeify/test-connection"'),
    routeSource('app.post("/api/tradeify/test-connection"', 'app.post("/api/rithmic/test-connection"'),
    routeSource('app.post("/api/rithmic/test-connection"', 'app.get("/api/accounts/:id/rithmic-readiness"'),
  ];

  for (const route of routes) {
    assert.match(route, /if \(!req\.session\?\.userId\)/);
    assert.match(route, /res\.status\(401\)/);
  }
});

test("Tradovate account and position reads verify saved-account ownership", () => {
  const routes = [
    routeSource('app.get("/api/tradovate/accounts/:username"', 'app.get("/api/tradovate/positions/:username"'),
    routeSource('app.get("/api/tradovate/positions/:username"', '// Accounts routes'),
  ];

  for (const route of routes) {
    assert.match(route, /if \(!req\.session\?\.userId\)/);
    assert.match(route, /eq\(accounts\.userId, req\.session\.userId\)/);
    assert.match(route, /eq\(accounts\.tradovateUsername, username\)/);
    assert.match(route, /if \(!ownedAccount\)/);
  }

  assert.match(source, /operationalLogger\.error\("broker\.tradovate_accounts_load_failed"/);
  assert.match(source, /message: "Failed to load Tradovate accounts"/);
  assert.match(source, /operationalLogger\.error\("broker\.tradovate_positions_load_failed"/);
  assert.match(source, /message: "Failed to load Tradovate positions"/);
});
