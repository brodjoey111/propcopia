import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const createRoute = routesSource.slice(
  routesSource.indexOf('app.post("/api/accounts"'),
  routesSource.indexOf('app.get("/api/accounts"'),
);

test("account removal route is authenticated and owner scoped", () => {
  assert.match(routesSource, /app\.delete\("\/api\/accounts\/:id"/);
  assert.match(routesSource, /eq\(accounts\.id, id\), eq\(accounts\.userId, userId\)/);
  assert.match(routesSource, /message: "Not authenticated"/);
  assert.match(routesSource, /message: "Account not found"/);
});

test("account removal route checks runtime dependencies before deleting", () => {
  assert.match(routesSource, /await ensurePersistedCopyGroupsLoaded\(userId\);/);
  assert.match(routesSource, /const removalDecision = evaluateAccountRemoval\(\{/);
  assert.match(routesSource, /tradeCopyStatus: tradeCopyEngines\.get\(userId\)\?\.getStatus\(\)/);
  assert.match(routesSource, /if \(!removalDecision\.allowed\) \{/);
  assert.match(routesSource, /return res\.status\(409\)\.json\(\{/);
});

test("account removal clears account-scoped runtime state after deletion", () => {
  assert.match(routesSource, /await db\s*\.delete\(accounts\)/);
  assert.match(routesSource, /rithmicReconnectValidationStore\.clear\(id\);/);
  assert.match(routesSource, /accountConnectionRecoveryStore\.remove\(userId, id\);/);
  assert.match(routesSource, /clearRuntimeSnapshotCache\(userId\);/);
  assert.match(routesSource, /operationalLogger\.error\("account\.remove_failed"/);
  assert.match(routesSource, /message: "Failed to remove account"/);
});

test("account creation route logs failures safely and avoids returning raw exception messages", () => {
  assert.match(createRoute, /if \(!req\.session\.userId\) \{/);
  assert.match(createRoute, /insertAccountSchema\.parse/);
  assert.match(createRoute, /operationalLogger\.error\("account\.create_failed"/);
  assert.match(createRoute, /message: "Failed to create account"/);
  assert.doesNotMatch(createRoute, /error instanceof Error \? error\.message/);
});
