import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose authenticated execution follow-up review endpoints and dashboard recovery actions", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");
  const reviewRouteStart = routesSource.indexOf('app.get("/api/execution-follow-up/reviews"');
  const reviewRouteEnd = routesSource.indexOf('app.post("/api/runtime/dashboard-overview/recheck/:historyId"', reviewRouteStart);
  const reviewRouteSource = routesSource.slice(reviewRouteStart, reviewRouteEnd);
  const dashboardRecoveryStart = routesSource.indexOf('app.post("/api/runtime/dashboard-overview/recheck/:historyId"');
  const dashboardRecoveryEnd = routesSource.indexOf('app.get("/api/operations/overview"', dashboardRecoveryStart);
  const dashboardRecoverySource = routesSource.slice(dashboardRecoveryStart, dashboardRecoveryEnd);

  assert.ok(reviewRouteStart >= 0 && reviewRouteEnd > reviewRouteStart);
  assert.ok(dashboardRecoveryStart >= 0 && dashboardRecoveryEnd > dashboardRecoveryStart);

  assert.match(reviewRouteSource, /app\.get\("\/api\/execution-follow-up\/reviews"/);
  assert.match(reviewRouteSource, /app\.post\("\/api\/execution-follow-up\/reviews"/);
  assert.match(reviewRouteSource, /upsertExecutionFollowUpReviewsSchema\.safeParse/);
  assert.match(reviewRouteSource, /executionFollowUpReviewStore\.listReviews/);
  assert.match(reviewRouteSource, /executionFollowUpReviewStore\.saveReviews/);
  assert.match(reviewRouteSource, /Execution history not found:/);
  assert.match(reviewRouteSource, /tradeHistoryPersistence\.hydrateUser/);
  assert.match(reviewRouteSource, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
  assert.match(reviewRouteSource, /operations\.execution_follow_up_reviews_load_failed/);
  assert.match(reviewRouteSource, /operations\.execution_follow_up_reviews_save_failed/);
  assert.match(reviewRouteSource, /message: "Failed to load execution follow-up reviews"/);
  assert.match(reviewRouteSource, /message: "Failed to save execution follow-up reviews"/);

  assert.match(dashboardRecoverySource, /app\.post\("\/api\/runtime\/dashboard-overview\/recheck\/:historyId"/);
  assert.match(dashboardRecoverySource, /app\.post\("\/api\/runtime\/dashboard-overview\/review\/:historyId"/);
  assert.match(dashboardRecoverySource, /historyId/);
  assert.match(dashboardRecoverySource, /loadDashboardRuntimeOverviewForUser/);
  assert.match(dashboardRecoverySource, /recoveryItem/);
  assert.match(dashboardRecoverySource, /markRecoveryItemReviewed/);
  assert.match(dashboardRecoverySource, /Only failed or restart recovery items can be reviewed/);
  assert.match(dashboardRecoverySource, /operations\.dashboard_recovery_recheck_failed/);
  assert.match(dashboardRecoverySource, /operations\.dashboard_recovery_review_failed/);
  assert.match(dashboardRecoverySource, /message: "Failed to recheck dashboard recovery item"/);
  assert.match(dashboardRecoverySource, /message: "Failed to review dashboard recovery item"/);
});
