import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('routes expose the authenticated trade history endpoint', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');
  const routeStart = routesSource.indexOf('app.get("/api/trades/history"');
  const routeEnd = routesSource.indexOf('app.get("/api/trades/history/export.csv"', routeStart);
  const tradeHistoryRouteSource = routesSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(tradeHistoryRouteSource, /app\.get\("\/api\/trades\/history"/);
  assert.match(tradeHistoryRouteSource, /tradeHistoryStore\.listRecent/);
  assert.match(tradeHistoryRouteSource, /tradeHistoryPersistence\.hydrateUser/);
  assert.match(tradeHistoryRouteSource, /executionFollowUpReviewStore\.listReviews/);
  assert.match(tradeHistoryRouteSource, /req\.session\?\.userId/);
  assert.match(tradeHistoryRouteSource, /operationalLogger\.error\("trade_history\.list_failed"/);
  assert.match(tradeHistoryRouteSource, /message: "Failed to load trade history"/);
  assert.doesNotMatch(
    tradeHistoryRouteSource,
    /message: error instanceof Error \? error\.message : "Unknown error occurred"/,
  );
});

test('routes expose the authenticated trade history CSV export endpoint', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');
  const routeStart = routesSource.indexOf('app.get("/api/trades/history/export.csv"');
  const routeEnd = routesSource.indexOf('app.post("/api/copy-groups/register"', routeStart);
  const exportRouteSource = routesSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(exportRouteSource, /app\.get\("\/api\/trades\/history\/export\.csv"/);
  assert.match(exportRouteSource, /serializeTradeHistoryCsv/);
  assert.match(exportRouteSource, /Content-Disposition/);
  assert.match(exportRouteSource, /tradeHistoryPersistence\.hydrateUser/);
  assert.match(exportRouteSource, /operationalLogger\.error\("trade_history\.export_failed"/);
  assert.match(exportRouteSource, /message: "Failed to export trade history"/);
  assert.doesNotMatch(
    exportRouteSource,
    /message: error instanceof Error \? error\.message : "Unknown error occurred"/,
  );
});

test('routes parse trade history status and query filters', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /parseTradeHistoryStatuses/);
  assert.match(routesSource, /req\.query\.status/);
  assert.match(routesSource, /req\.query\.q/);
});
