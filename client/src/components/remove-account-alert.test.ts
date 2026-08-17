import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const alertSource = readFileSync(new URL("./remove-account-alert.tsx", import.meta.url), "utf8");
const accountsPageSource = readFileSync(new URL("../pages/accounts.tsx", import.meta.url), "utf8");

test("remove account alert clearly describes permanent saved-data removal", () => {
  assert.match(alertSource, /Remove this saved account\?/);
  assert.match(alertSource, /saved credentials and settings will be permanently removed/i);
  assert.match(alertSource, /This cannot be undone/i);
});

test("accounts page only enables removal after disconnect and uses the confirmation alert", () => {
  assert.match(accountsPageSource, /method: 'DELETE'/);
  assert.match(accountsPageSource, /disabled=\{accountControlsDisabled \|\| !!account\.isConnected\}/);
  assert.match(accountsPageSource, /<RemoveAccountAlert/);
  assert.match(accountsPageSource, /onConfirm=\{handleRemoveConfirm\}/);
});
