import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose authenticated copy-group alert review read and write endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/copy-groups\/alert-reviews"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/alert-reviews"/);
  assert.match(routesSource, /upsertCopyGroupAlertReviewsSchema\.safeParse/);
  assert.match(routesSource, /z\.enum\(\["pending", "reviewed"\]\)/);
  assert.match(routesSource, /copyGroupAlertReviewStore\.listReviews/);
  assert.match(routesSource, /copyGroupAlertReviewStore\.saveReviews/);
  assert.match(routesSource, /Copy-group alert story not found:/);
});
