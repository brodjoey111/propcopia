import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync("server/routes.ts", "utf8");
const pageSource = readFileSync("client/src/pages/economic-calendar.tsx", "utf8");
const calendarRoute = routesSource.slice(
  routesSource.indexOf('app.get("/api/economic-calendar"'),
  routesSource.indexOf('app.get("/api/leaderboard"'),
);

test("economic calendar returns no invented events without a live provider", () => {
  assert.match(calendarRoute, /source: "UNAVAILABLE"/);
  assert.match(calendarRoute, /isLive: false/);
  assert.match(calendarRoute, /events: \[\]/);
  assert.doesNotMatch(calendarRoute, /mockEvents|Non-Farm Payrolls|Consumer Price Index/);
});

test("economic calendar UI explains that live data is unavailable", () => {
  assert.match(pageSource, /useQuery<EconomicCalendarResponse>/);
  assert.match(pageSource, /Live calendar unavailable/);
  assert.match(pageSource, /No simulated events are shown/);
});
