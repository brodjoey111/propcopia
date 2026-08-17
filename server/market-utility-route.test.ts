import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routesSource = readFileSync("server/routes.ts", "utf8");

test("market utility routes return safe failure messages", () => {
  assert.match(routesSource, /app\.get\("\/api\/market\/prices"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.prices_load_failed"/);
  assert.match(routesSource, /message: "Failed to load market prices"/);

  assert.match(routesSource, /app\.get\("\/api\/economic-calendar"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.economic_calendar_load_failed"/);
  assert.match(routesSource, /message: "Failed to load economic calendar"/);

  assert.match(routesSource, /app\.get\("\/api\/leaderboard"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.leaderboard_load_failed"/);
  assert.match(routesSource, /message: "Failed to load leaderboard"/);

  assert.match(routesSource, /app\.get\("\/api\/market-movers"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.movers_load_failed"/);
  assert.match(routesSource, /message: "Failed to load market movers"/);
});

test("stock data routes return safe failure messages", () => {
  assert.match(routesSource, /app\.get\("\/api\/company\/:symbol"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.company_overview_load_failed"/);
  assert.match(routesSource, /message: "Failed to load company overview"/);

  assert.match(routesSource, /app\.get\("\/api\/stock\/:symbol\/chart"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.chart_load_failed"/);
  assert.match(routesSource, /message: "Failed to load live chart data"/);

  assert.match(routesSource, /app\.get\("\/api\/stock\/:symbol\/quote"/);
  assert.match(routesSource, /operationalLogger\.error\("market\.quote_load_failed"/);
  assert.match(routesSource, /message: "Failed to load quote"/);
});

test("watchlist routes stay authenticated and return safe failure messages", () => {
  const watchlistRoute = routesSource.slice(
    routesSource.indexOf('app.get("/api/watchlist"'),
    routesSource.indexOf('app.post("/api/chat"'),
  );

  assert.match(watchlistRoute, /if \(!req\.session\?\.userId\)/);
  assert.match(watchlistRoute, /operationalLogger\.warn\("watchlist\.quote_load_failed"/);
  assert.match(watchlistRoute, /operationalLogger\.error\("watchlist\.load_failed"/);
  assert.match(watchlistRoute, /message: "Failed to load watchlist"/);
  assert.match(watchlistRoute, /operationalLogger\.error\("watchlist\.add_failed"/);
  assert.match(watchlistRoute, /message: "Failed to add to watchlist"/);
  assert.match(watchlistRoute, /operationalLogger\.error\("watchlist\.remove_failed"/);
  assert.match(watchlistRoute, /message: "Failed to remove from watchlist"/);
});
