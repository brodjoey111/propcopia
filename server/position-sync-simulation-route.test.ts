import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const routesSource = readFileSync("server/routes.ts", "utf8");

test("position sync simulation route is authenticated and validates its payload", () => {
  const routeStart = routesSource.indexOf('app.post("/api/position-sync/simulations"');
  const routeEnd = routesSource.indexOf('app.post("/api/position-sync/reviews"', routeStart);
  const simulationRouteSource = routesSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(simulationRouteSource, /app\.post\("\/api\/position-sync\/simulations"/);
  assert.match(simulationRouteSource, /if \(!req\.session\?\.userId\) \{/);
  assert.match(simulationRouteSource, /createPositionSyncSimulationSchema\.safeParse\(req\.body\)/);
  assert.match(simulationRouteSource, /message: "Invalid position sync simulation payload"/);
  assert.match(simulationRouteSource, /operations\.position_sync_simulation_failed/);
  assert.match(simulationRouteSource, /message: "Failed to simulate position sync"/);
  assert.doesNotMatch(simulationRouteSource, /Error simulating position sync:/);
  assert.doesNotMatch(
    simulationRouteSource,
    /message: error instanceof Error \? error\.message : "Unknown error occurred"/,
  );
});

test("position sync simulation route uses the signed-in user's runtime overview", () => {
  assert.match(routesSource, /scope: "position-sync-simulation"/);
  assert.match(routesSource, /userId: req\.session\.userId/);
  assert.match(routesSource, /loadPositionSyncOverviewForUser\(req\.session\.userId!\)/);
  assert.match(routesSource, /const simulationResult = buildPositionSyncSimulation\(\{/);
});

test("position sync simulation route persists evidence without submitting orders", () => {
  const routeStart = routesSource.indexOf('app.post("/api/position-sync/simulations"');
  const routeEnd = routesSource.indexOf('app.post("/api/position-sync/reviews"', routeStart);
  const simulationRouteSource = routesSource.slice(routeStart, routeEnd);

  assert.match(routesSource, /status: "simulated"/);
  assert.match(routesSource, /simulationId: simulation\.simulationId/);
  assert.match(routesSource, /simulationFingerprint: simulation\.planFingerprint/);
  assert.match(routesSource, /simulationPlan: simulation/);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.doesNotMatch(simulationRouteSource, /submitOrder|ExecutionManager|TradeCopyEngine/);
});
