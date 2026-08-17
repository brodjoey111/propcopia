import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("profile route applies bounded profile validation before storage", () => {
  assert.match(routesSource, /app\.patch\("\/api\/user\/profile"/);
  assert.match(routesSource, /const result = parseUserProfileUpdate\(req\.body\);/);
  assert.match(routesSource, /storage\.updateUserProfile\(req\.session\.userId, result\.data\)/);
});

test("authenticated user responses sanitize stored profile pictures", () => {
  assert.match(routesSource, /profilePicture: serializeProfilePicture\(user\.profilePicture\)/);
});
