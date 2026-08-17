import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROFILE_PICTURE_DATA_URL_LENGTH,
  parseUserProfileUpdate,
  serializeProfilePicture,
} from "./user-profile-update";

const compactImage = `data:image/jpeg;base64,${Buffer.from("avatar").toString("base64")}`;

test("profile updates trim bounded text and accept compact supported images", () => {
  assert.deepEqual(parseUserProfileUpdate({ bio: "  disciplined trader  ", profilePicture: compactImage }), {
    success: true,
    data: { bio: "disciplined trader", profilePicture: compactImage },
  });
});

test("profile updates reject oversized, unsupported, and unknown values", () => {
  assert.equal(parseUserProfileUpdate({ bio: "x".repeat(201) }).success, false);
  assert.equal(parseUserProfileUpdate({ profilePicture: "https://example.test/avatar.png" }).success, false);
  assert.equal(parseUserProfileUpdate({ profilePicture: `data:image/jpeg;base64,${"A".repeat(MAX_PROFILE_PICTURE_DATA_URL_LENGTH)}` }).success, false);
  assert.equal(parseUserProfileUpdate({ bio: "ok", admin: true }).success, false);
});

test("authenticated user serialization drops legacy oversized or invalid image payloads", () => {
  assert.equal(serializeProfilePicture(compactImage), compactImage);
  assert.equal(serializeProfilePicture("not-an-image"), null);
  assert.equal(serializeProfilePicture("x".repeat(MAX_PROFILE_PICTURE_DATA_URL_LENGTH + 1)), null);
});
