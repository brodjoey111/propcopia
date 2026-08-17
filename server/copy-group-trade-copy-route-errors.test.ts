import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routesSource = readFileSync("server/routes.ts", "utf8");

test("copy-group mutation routes log and return safe failure messages", () => {
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.register_failed"/);
  assert.match(routesSource, /message: "Failed to register copy group"/);
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.start_failed"/);
  assert.match(routesSource, /message: "Failed to start copy group"/);
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.stop_failed"/);
  assert.match(routesSource, /message: "Failed to stop copy group"/);
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.pause_failed"/);
  assert.match(routesSource, /message: "Failed to pause copy group"/);
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.resume_failed"/);
  assert.match(routesSource, /message: "Failed to resume copy group"/);
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.emergency_stop_failed"/);
  assert.match(routesSource, /message: "Failed to emergency stop copy group"/);
  assert.match(routesSource, /operationalLogger\.error\("copy_group\.delete_failed"/);
  assert.match(routesSource, /message: "Failed to delete copy group"/);
});

test("trade-copy routes log and return safe failure messages", () => {
  assert.match(routesSource, /operationalLogger\.error\("trade_copy\.start_failed"/);
  assert.match(routesSource, /message: "Failed to start trade copying"/);
  assert.match(routesSource, /operationalLogger\.error\("trade_copy\.add_follower_failed"/);
  assert.match(routesSource, /message: "Failed to add follower account"/);
  assert.match(routesSource, /operationalLogger\.error\("trade_copy\.stop_failed"/);
  assert.match(routesSource, /message: "Failed to stop trade copying"/);
  assert.match(routesSource, /operationalLogger\.error\("trade_copy\.stats_load_failed"/);
  assert.match(routesSource, /message: "Failed to load trade copy stats"/);
  assert.match(routesSource, /operationalLogger\.error\("trade_copy\.status_load_failed"/);
  assert.match(routesSource, /message: "Failed to load trade copy status"/);
});
