import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("server signals use one graceful shutdown coordinator", () => {
  assert.match(indexSource, /new GracefulShutdownCoordinator/);
  assert.match(indexSource, /process\.once\("SIGTERM"/);
  assert.match(indexSource, /process\.once\("SIGINT"/);
  assert.match(indexSource, /closeHttpServer\(server\)/);
  assert.match(indexSource, /tradeLogger\.shutdown\(\)/);
  assert.match(indexSource, /name: "application-database", run: closeDatabasePool/);
  assert.match(indexSource, /pgPool\.end\(\)/);
});

test("route runtime cleanup disconnects engines and Rithmic sessions without trading", () => {
  assert.match(routesSource, /export async function shutdownRouteRuntime/);
  assert.match(routesSource, /engine\.disconnect\(\)/);
  assert.match(routesSource, /api\.disconnect\(\)/);
  assert.match(routesSource, /marketDataService\.close\(\)/);
  assert.match(routesSource, /client\.terminate\(\)/);
  assert.doesNotMatch(routesSource.slice(
    routesSource.indexOf("export async function shutdownRouteRuntime"),
    routesSource.indexOf("const tradeHistoryStatuses"),
  ), /placeOrder|closeAllPositions|submitOrder/);
});
