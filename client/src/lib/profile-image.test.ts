import assert from "node:assert/strict";
import test from "node:test";

import {
  estimateDataUrlBytes,
  PROFILE_IMAGE_MAX_SOURCE_BYTES,
  validateProfileImageFile,
} from "./profile-image";

test("profile image validation accepts bounded images and rejects other files", () => {
  assert.equal(validateProfileImageFile({ type: "image/jpeg", size: 50_000 }), null);
  assert.match(validateProfileImageFile({ type: "application/pdf", size: 50_000 }) ?? "", /image file/i);
  assert.match(
    validateProfileImageFile({ type: "image/png", size: PROFILE_IMAGE_MAX_SOURCE_BYTES + 1 }) ?? "",
    /smaller than 5 MB/i,
  );
});

test("profile image byte estimates account for base64 padding", () => {
  assert.equal(estimateDataUrlBytes("data:image/jpeg;base64,YQ=="), 1);
  assert.equal(estimateDataUrlBytes("data:image/jpeg;base64,YWI="), 2);
  assert.equal(estimateDataUrlBytes("data:image/jpeg;base64,YWJj"), 3);
});
