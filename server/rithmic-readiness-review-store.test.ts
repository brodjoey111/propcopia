import test from "node:test";
import assert from "node:assert/strict";

import { buildRithmicReadinessReviewKey } from "./rithmic-readiness-review-store";

test("buildRithmicReadinessReviewKey uses the story key as the stable review key", () => {
  assert.equal(
    buildRithmicReadinessReviewKey("rithmic-readiness:acct-1"),
    "rithmic-readiness:acct-1",
  );
});
