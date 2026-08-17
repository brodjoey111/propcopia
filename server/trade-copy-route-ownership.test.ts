import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("server/routes.ts", "utf8");

function routeSource(start: string, end: string): string {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

test("trade-copy mutation routes use authenticated ownership", () => {
  const addFollower = routeSource(
    'app.post("/api/trade-copy/add-follower"',
    'app.post("/api/trade-copy/stop"',
  );
  const stop = routeSource(
    'app.post("/api/trade-copy/stop"',
    'app.get("/api/trade-copy/stats/:userId"',
  );

  for (const route of [addFollower, stop]) {
    assert.match(route, /if \(!req\.session\?\.userId\)/);
    assert.match(route, /const userId = req\.session\.userId/);
    assert.match(route, /req\.body\.userId !== userId/);
    assert.match(route, /res\.status\(403\)/);
  }

  assert.doesNotMatch(addFollower, /const \{ userId, accountId/);
  assert.doesNotMatch(stop, /const \{ userId \} = req\.body/);
});

test("trade-copy read routes reject cross-user path parameters", () => {
  const stats = routeSource(
    'app.get("/api/trade-copy/stats/:userId"',
    'app.get("/api/trade-copy/status/:userId"',
  );
  const status = routeSource(
    'app.get("/api/trade-copy/status/:userId"',
    'app.get("/api/market/prices"',
  );

  for (const route of [stats, status]) {
    assert.match(route, /if \(!req\.session\?\.userId\)/);
    assert.match(route, /req\.params\.userId !== req\.session\.userId/);
    assert.match(route, /const userId = req\.session\.userId/);
    assert.match(route, /res\.status\(403\)/);
  }
});
