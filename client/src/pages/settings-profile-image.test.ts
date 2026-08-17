import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./settings.tsx", import.meta.url), "utf8");

test("settings prepares compact profile images before saving them", () => {
  assert.match(source, /prepareProfileImage/);
  assert.match(source, /setProfilePicture\(await prepareProfileImage\(file\)\)/);
  assert.match(source, /isProcessingProfilePicture/);
  assert.doesNotMatch(source, /readAsDataURL/);
});

test("settings supports explicit photo removal and avoids unchanged profile writes", () => {
  assert.match(source, /button-remove-picture/);
  assert.match(source, /setProfilePicture\(""\)/);
  assert.match(source, /profileHasChanges/);
  assert.match(source, /!profileHasChanges/);
});

test("settings saves a bounded professional title with the profile", () => {
  assert.match(source, /input-profile-title/);
  assert.match(source, /maxLength=\{80\}/);
  assert.match(source, /title: title\.trim\(\) \|\| null/);
});
