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
