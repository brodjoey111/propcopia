import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("billing status is authenticated and server-owned", () => {
  const start = routesSource.indexOf('app.get("/api/billing/status"');
  const end = routesSource.indexOf("\n  app.", start + 1);
  const route = routesSource.slice(start, end);

  assert.notEqual(start, -1);
  assert.match(route, /if \(!req\.session\?\.userId\)/);
  assert.match(route, /storage\.getUser\(req\.session\.userId\)/);
  assert.match(route, /buildLicenseSnapshot\(user\)/);
  assert.match(route, /checkoutAvailable: false/);
  assert.match(route, /customerPortalAvailable: false/);
  assert.doesNotMatch(route, /stripeCustomerId/);
  assert.doesNotMatch(route, /stripeSubscriptionId/);
});
