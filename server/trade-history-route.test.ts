import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('routes expose the authenticated trade history endpoint', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.get\("\/api\/trades\/history"/);
  assert.match(routesSource, /tradeHistoryStore\.listRecent/);
  assert.match(routesSource, /tradeHistoryPersistence\.hydrateUser/);
  assert.match(routesSource, /executionFollowUpReviewStore\.listReviews/);
  assert.match(routesSource, /req\.session\?\.userId/);
});

test('routes expose the authenticated trade history CSV export endpoint', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.get\("\/api\/trades\/history\/export\.csv"/);
  assert.match(routesSource, /serializeTradeHistoryCsv/);
  assert.match(routesSource, /Content-Disposition/);
  assert.match(routesSource, /tradeHistoryPersistence\.hydrateUser/);
});

test('routes parse trade history status and query filters', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /parseTradeHistoryStatuses/);
  assert.match(routesSource, /req\.query\.status/);
  assert.match(routesSource, /req\.query\.q/);
});
