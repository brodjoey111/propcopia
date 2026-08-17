import assert from "node:assert/strict";
import test from "node:test";
import { getProfileInitial, getProfileSubtitle } from "./user-profile-display";

test("profile display derives a stable uppercase initial", () => {
  assert.equal(getProfileInitial(" joseph"), "J");
  assert.equal(getProfileInitial(""), "U");
  assert.equal(getProfileInitial(null), "U");
});

test("profile display prefers a concise title before the biography", () => {
  assert.equal(
    getProfileSubtitle({ title: " Futures trader ", bio: "Longer biography" }),
    "Futures trader",
  );
  assert.equal(getProfileSubtitle({ title: " ", bio: " Disciplined operator " }), "Disciplined operator");
  assert.equal(getProfileSubtitle({}), "Trader");
  assert.equal(getProfileSubtitle(null), "Trader");
});
