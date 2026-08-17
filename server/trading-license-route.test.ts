import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

function route(start: string, end: string): string {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

test("copy-group start checks the signed-in user's license before changing runtime state", () => {
  const startRoute = route(
    'app.post("/api/copy-groups/start"',
    'app.post("/api/copy-groups/stop"',
  );
  assert.match(startRoute, /storage\.getUser\(req\.session\.userId\)/);
  assert.match(startRoute, /evaluateTradingLicense\(buildLicenseSnapshot\(user\)\)/);
  assert.match(startRoute, /return res\.status\(403\)\.json\(\{ success: false, \.\.\.licenseDecision \}\)/);
  assert.ok(startRoute.indexOf("evaluateTradingLicense") < startRoute.indexOf("runCopyGroupLifecycleAction"));
});

test("copy-group resume checks licensing while safety actions stay unblocked", () => {
  const resumeRoute = route(
    'app.post("/api/copy-groups/resume"',
    'app.post("/api/copy-groups/emergency-stop"',
  );
  const stopRoute = route(
    'app.post("/api/copy-groups/stop"',
    'app.post("/api/copy-groups/pause"',
  );
  const pauseRoute = route(
    'app.post("/api/copy-groups/pause"',
    'app.post("/api/copy-groups/resume"',
  );
  assert.match(resumeRoute, /evaluateTradingLicense\(buildLicenseSnapshot\(user\)\)/);
  assert.ok(resumeRoute.indexOf("evaluateTradingLicense") < resumeRoute.indexOf("runCopyGroupLifecycleAction"));
  assert.doesNotMatch(stopRoute, /evaluateTradingLicense/);
  assert.doesNotMatch(pauseRoute, /evaluateTradingLicense/);
});

test("direct trade-copy start checks licensing before reserving or wiring an engine", () => {
  const startRoute = route(
    'app.post("/api/trade-copy/start"',
    'app.post("/api/trade-copy/stop"',
  );
  assert.match(startRoute, /storage\.getUser\(userId\)/);
  assert.match(startRoute, /evaluateTradingLicense\(buildLicenseSnapshot\(user\)\)/);
  assert.ok(startRoute.indexOf("evaluateTradingLicense") < startRoute.indexOf("tradeCopyStartsInProgress.add"));
  assert.ok(startRoute.indexOf("evaluateTradingLicense") < startRoute.indexOf("refreshRithmicAccountIdentity"));
});
