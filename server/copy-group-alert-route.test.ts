import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("copy-group alerts route exposes shared alert stories without full runtime payloads", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/copy-groups\/alerts"/);
  assert.match(routesSource, /copyGroupAlertStore\.listActiveStories/);
  assert.match(routesSource, /copyGroupAlertStore\.listRecent/);
  assert.match(routesSource, /limit:\s*12/);
  assert.match(routesSource, /limit:\s*24/);
});
