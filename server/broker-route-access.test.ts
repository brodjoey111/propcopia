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

test("broker credential test failures use operational logging and fixed 500 messages", () => {
  const tradovateRoute = routeSource(
    'app.post("/api/tradovate/test-connection"',
    'app.post("/api/tradeify/test-connection"',
  );
  const tradeifyRoute = routeSource(
    'app.post("/api/tradeify/test-connection"',
    'app.post("/api/rithmic/test-connection"',
  );
  const rithmicRoute = routeSource(
    'app.post("/api/rithmic/test-connection"',
    'app.get("/api/accounts/:id/rithmic-readiness"',
  );

  assert.match(tradovateRoute, /operationalLogger\.error\("broker\.tradovate_test_connection_failed"/);
  assert.match(tradovateRoute, /message: "Failed to test Tradovate connection"/);
  assert.doesNotMatch(tradovateRoute, /Tradovate connection error:/);
  assert.doesNotMatch(
    tradovateRoute,
    /message: error instanceof Error \? error\.message : 'Unknown error occurred'/,
  );

  assert.match(tradeifyRoute, /operationalLogger\.error\("broker\.tradeify_test_connection_failed"/);
  assert.match(tradeifyRoute, /message: "Failed to test Tradeify connection"/);
  assert.doesNotMatch(tradeifyRoute, /Tradeify connection error:/);
  assert.doesNotMatch(
    tradeifyRoute,
    /message: error instanceof Error \? error\.message : 'Unknown error occurred'/,
  );

  assert.match(rithmicRoute, /operationalLogger\.error\("broker\.rithmic_test_connection_failed"/);
  assert.match(rithmicRoute, /await disconnectBrokerSessionQuietly\(candidateSession\);/);
  assert.match(rithmicRoute, /message: "Failed to test Rithmic connection"/);
  assert.doesNotMatch(rithmicRoute, /Rithmic connection error:/);
  assert.doesNotMatch(
    rithmicRoute,
    /message: error instanceof Error \? error\.message : 'Unknown error occurred'/,
  );
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
