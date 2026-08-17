import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose authenticated position sync review read and write endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");
  const routeStart = routesSource.indexOf('app.get("/api/position-sync/reviews"');
  const routeEnd = routesSource.indexOf('app.get("/api/risk-follow-up/reviews"', routeStart);
  const reviewRouteSource = routesSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(reviewRouteSource, /app\.get\("\/api\/position-sync\/reviews"/);
  assert.match(reviewRouteSource, /app\.post\("\/api\/position-sync\/reviews"/);
  assert.match(reviewRouteSource, /upsertPositionSyncReviewsSchema\.safeParse/);
  assert.match(
    routesSource,
    /z\.enum\(\["reviewed", "simulated", "approved", "handed_off", "completed_manually"\]\)/,
  );
  assert.match(reviewRouteSource, /positionSyncReviewStore\.listReviews/);
  assert.match(reviewRouteSource, /positionSyncReviewStore\.saveReviews/);
  assert.match(reviewRouteSource, /ensurePersistedCopyGroupsLoaded/);
  assert.match(reviewRouteSource, /validatePositionSyncWorkflowTransition/);
  assert.match(reviewRouteSource, /return res\.status\(409\)\.json/);
  assert.match(reviewRouteSource, /operations\.position_sync_reviews_load_failed/);
  assert.match(reviewRouteSource, /operations\.position_sync_reviews_save_failed/);
  assert.match(reviewRouteSource, /message: "Failed to load position sync reviews"/);
  assert.match(reviewRouteSource, /message: "Failed to save position sync reviews"/);
  assert.doesNotMatch(reviewRouteSource, /Error loading position sync reviews:/);
  assert.doesNotMatch(reviewRouteSource, /Error saving position sync reviews:/);
  assert.doesNotMatch(
    reviewRouteSource,
    /message: error instanceof Error \? error\.message : "Unknown error occurred"/,
  );
});
