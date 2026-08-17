import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("profile route applies bounded profile validation before storage", () => {
  assert.match(routesSource, /app\.patch\("\/api\/user\/profile"/);
  assert.match(routesSource, /if \(!req\.session\?\.userId\)/);
  assert.match(routesSource, /const result = parseUserProfileUpdate\(req\.body\);/);
  assert.match(routesSource, /storage\.updateUserProfile\(req\.session\.userId, result\.data\)/);
  assert.match(routesSource, /operationalLogger\.error\("user\.profile_update_failed"/);
  assert.match(routesSource, /message: "Failed to update profile"/);
});

test("authenticated user responses sanitize stored profile pictures", () => {
  assert.match(routesSource, /profilePicture: serializeProfilePicture\(user\.profilePicture\)/);
});
