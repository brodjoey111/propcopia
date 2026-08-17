import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose authenticated copy-group alert review read and write endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");
  const routeStart = routesSource.indexOf('app.get("/api/copy-groups/alert-reviews"');
  const routeEnd = routesSource.indexOf('app.get("/api/copy-groups/:groupId"', routeStart);
  const reviewRouteSource = routesSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(reviewRouteSource, /app\.get\("\/api\/copy-groups\/alert-reviews"/);
  assert.match(reviewRouteSource, /app\.post\("\/api\/copy-groups\/alert-reviews"/);
  assert.match(reviewRouteSource, /upsertCopyGroupAlertReviewsSchema\.safeParse/);
  assert.match(routesSource, /z\.enum\(\["pending", "reviewed"\]\)/);
  assert.match(reviewRouteSource, /copyGroupAlertReviewStore\.listReviews/);
  assert.match(reviewRouteSource, /copyGroupAlertReviewStore\.saveReviews/);
  assert.match(reviewRouteSource, /Copy-group alert story not found:/);
  assert.match(reviewRouteSource, /operations\.copy_group_alert_reviews_load_failed/);
  assert.match(reviewRouteSource, /operations\.copy_group_alert_reviews_save_failed/);
  assert.match(reviewRouteSource, /message: "Failed to load copy-group alert reviews"/);
  assert.match(reviewRouteSource, /message: "Failed to save copy-group alert reviews"/);
  assert.doesNotMatch(reviewRouteSource, /Error loading copy-group alert reviews:/);
  assert.doesNotMatch(reviewRouteSource, /Error saving copy-group alert reviews:/);
  assert.doesNotMatch(
    reviewRouteSource,
    /message: error instanceof Error \? error\.message : "Unknown error occurred"/,
  );
});
