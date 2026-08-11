import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose authenticated risk follow-up review read and write endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/risk-follow-up\/reviews"/);
  assert.match(routesSource, /app\.post\("\/api\/risk-follow-up\/reviews"/);
  assert.match(routesSource, /upsertRiskFollowUpReviewsSchema\.safeParse/);
  assert.match(routesSource, /z\.enum\(\["pending", "reviewed"\]\)/);
  assert.match(routesSource, /riskFollowUpReviewStore\.listReviews/);
  assert.match(routesSource, /riskFollowUpReviewStore\.saveReviews/);
  assert.match(routesSource, /Account not found:/);
});
