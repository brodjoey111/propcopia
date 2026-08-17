import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("login validates credentials and rotates the authenticated session", () => {
  assert.match(routesSource, /loginCredentialsSchema\.safeParse\(req\.body\)/);
  assert.match(routesSource, /await establishAuthenticatedSession\(req, user\)/);
  assert.match(routesSource, /message: "Failed to complete login"/);
});

test("password changes require authentication, current-password verification, and a bounded new password", () => {
  assert.match(routesSource, /app\.post\("\/api\/auth\/change-password"/);
  assert.match(routesSource, /if \(!req\.session\?\.userId\)/);
  assert.match(routesSource, /changePasswordSchema\.safeParse\(req\.body\)/);
  assert.match(routesSource, /bcrypt\.compare\(result\.data\.currentPassword, user\.password\)/);
  assert.match(routesSource, /storage\.updateUserPassword\(user\.id, hashedPassword\)/);
  assert.match(routesSource, /await establishAuthenticatedSession\(req, user\)/);
});

test("password-change success does not serialize user or credential data", () => {
  const routeStart = routesSource.indexOf('app.post("/api/auth/change-password"');
  const nextRoute = routesSource.indexOf("\n  app.", routeStart + 1);
  const route = routesSource.slice(routeStart, nextRoute);
  assert.match(route, /message: "Password updated successfully"/);
  assert.doesNotMatch(route, /serializeAuthenticatedUser/);
  assert.doesNotMatch(route, /password: hashedPassword/);
});

test("auth me clears stale sessions before returning not authenticated", () => {
  const routeStart = routesSource.indexOf('app.get("/api/auth/me"');
  const nextRoute = routesSource.indexOf("\n  app.", routeStart + 1);
  const route = routesSource.slice(routeStart, nextRoute);
  assert.match(route, /const userId = req\.session\?\.userId/);
  assert.match(route, /const user = await storage\.getUser\(userId\)/);
  assert.match(route, /operationalLogger\.warn\("auth\.stale_session_cleared"/);
  assert.match(route, /session\.destroy\(\(\) => resolve\(\)\)/);
  assert.match(route, /res\.clearCookie\("connect\.sid"\)/);
  assert.match(route, /serializeAuthenticatedUser\(user\)/);
  assert.doesNotMatch(route, /password:/);
});
