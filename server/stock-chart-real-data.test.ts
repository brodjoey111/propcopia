import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync("server/routes.ts", "utf8");
const chartSource = readFileSync("client/src/components/stock-price-chart.tsx", "utf8");
const chartRoute = routesSource.slice(
  routesSource.indexOf('app.get("/api/stock/:symbol/chart"'),
  routesSource.indexOf('app.get("/api/stock/:symbol/quote"'),
);

test("stock chart never generates fallback candles", () => {
  assert.doesNotMatch(routesSource, /generateSimulatedChartData/);
  assert.doesNotMatch(chartRoute, /Math\.random|simulated: true|using simulated data/);
  assert.match(chartRoute, /source: "UNAVAILABLE"/);
  assert.match(chartRoute, /candles: \[\]/);
  assert.match(chartRoute, /source: "ALPHA_VANTAGE"/);
  assert.match(chartRoute, /isLive: true/);
});

test("stock chart UI explains provider errors without drawing fake history", () => {
  assert.match(chartSource, /const \{ data, isLoading, error \} = useQuery/);
  assert.match(chartSource, /Live chart unavailable/);
  assert.match(chartSource, /No simulated candles are shown/);
});
