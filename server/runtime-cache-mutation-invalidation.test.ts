import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

function route(start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `Missing route: ${start}`);
  assert.ok(endIndex > startIndex, `Missing route boundary: ${end}`);
  return source.slice(startIndex, endIndex);
}

const copyGroupRoutes = [
  ["register", "start"],
  ["start", "stop"],
  ["stop", "pause"],
  ["pause", "resume"],
  ["resume", "emergency-stop"],
] as const;

for (const [action, nextAction] of copyGroupRoutes) {
  test(`copy-group ${action} clears the user's runtime snapshots after mutation`, () => {
    const routeSource = route(
      `app.post("/api/copy-groups/${action}"`,
      `app.post("/api/copy-groups/${nextAction}"`,
    );
    assert.match(routeSource, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
  });
}

test("copy-group emergency stop and delete clear runtime snapshots", () => {
  const emergencyStop = route(
    'app.post("/api/copy-groups/emergency-stop"',
    'app.delete("/api/copy-groups/:groupId"',
  );
  const remove = route(
    'app.delete("/api/copy-groups/:groupId"',
    '// Authentication routes',
  );
  assert.match(emergencyStop, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
  assert.match(remove, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
});

test("account creation and state changes clear owner runtime snapshots", () => {
  const boundaries = [
    ['app.post("/api/accounts"', 'app.get("/api/accounts"'],
    ['app.post("/api/accounts/:id/connect"', 'app.patch("/api/user/settings"'],
    ['app.post("/api/accounts/:id/disconnect"', 'app.patch("/api/accounts/:id/broker-settings"'],
    ['app.patch("/api/accounts/:id/broker-settings"', 'app.patch("/api/accounts/:id/account-type"'],
    ['app.patch("/api/accounts/:id/account-type"', 'app.patch("/api/accounts/:id/risk-settings"'],
  ] as const;
  for (const [start, end] of boundaries) {
    assert.match(route(start, end), /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
  }
});

test("trade-copy start, follower add, and stop clear user runtime snapshots", () => {
  const boundaries = [
    ['app.post("/api/trade-copy/start"', 'app.post("/api/trade-copy/add-follower"'],
    ['app.post("/api/trade-copy/add-follower"', 'app.post("/api/trade-copy/stop"'],
    ['app.post("/api/trade-copy/stop"', 'app.get("/api/trade-copy/stats/:userId"'],
  ] as const;
  for (const [start, end] of boundaries) {
    assert.match(route(start, end), /clearRuntimeSnapshotCache\(userId\)/);
  }
});
