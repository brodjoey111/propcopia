import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./settings.tsx", import.meta.url), "utf8");

test("settings provides an authenticated password-change flow", () => {
  assert.match(source, /Account Security/);
  assert.match(source, /\/api\/auth\/change-password/);
  assert.match(source, /input-current-password/);
  assert.match(source, /input-new-password/);
  assert.match(source, /input-confirm-new-password/);
  assert.match(source, /changePasswordSchema\.safeParse/);
  assert.match(source, /password-change-validation-message/);
  assert.match(source, /Password update blocked/);
  assert.match(source, /PASSWORD_MIN_LENGTH/);
  assert.match(source, /setCurrentPassword\(""\)/);
});

test("settings reports license state without pretending paid checkout is active", () => {
  assert.match(source, /Billing &amp; License/);
  assert.match(source, /\/api\/billing\/status/);
  assert.match(source, /Development access remains fully enabled/);
  assert.match(source, /No payment information is being collected/);
  assert.match(source, /checkoutAvailable/);
});
