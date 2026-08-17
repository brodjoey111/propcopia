import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose authenticated position sync review read and write endpoints", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/position-sync\/reviews"/);
  assert.match(routesSource, /app\.post\("\/api\/position-sync\/reviews"/);
  assert.match(routesSource, /upsertPositionSyncReviewsSchema\.safeParse/);
  assert.match(
    routesSource,
    /z\.enum\(\["reviewed", "simulated", "approved", "handed_off", "completed_manually"\]\)/,
  );
  assert.match(routesSource, /positionSyncReviewStore\.listReviews/);
  assert.match(routesSource, /positionSyncReviewStore\.saveReviews/);
  assert.match(routesSource, /ensurePersistedCopyGroupsLoaded/);
  assert.match(routesSource, /validatePositionSyncWorkflowTransition/);
  assert.match(routesSource, /return res\.status\(409\)\.json/);
});
