import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("operator views use the slower operator refresh budget", () => {
  for (const path of ["../pages/activity.tsx", "../pages/trades.tsx", "../hooks/use-notifications.ts"]) {
    assert.match(source(path), /refetchInterval: OPERATOR_QUERY_POLL_MS/);
  }
});

test("account and dashboard readiness use the passive refresh budget", () => {
  assert.match(source("../pages/accounts.tsx"), /refetchInterval: PASSIVE_QUERY_POLL_MS/);
  assert.match(source("../pages/dashboard.tsx"), /refetchInterval: PASSIVE_QUERY_POLL_MS/);
});

test("kill-switch status keeps its faster safety refresh", () => {
  const killSwitch = source("../components/kill-switch.tsx");
  assert.match(killSwitch, /const POLL_MS = 10_000/);
  assert.match(killSwitch, /refetchInterval: POLL_MS/);
});
